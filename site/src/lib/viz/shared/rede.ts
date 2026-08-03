/**
 * Modulo de rede compartilhado.
 *
 * Serve os cinco graficos de rede do acervo. Cada um deles vira um arquivo de
 * poucas linhas em `charts/network/`, que so chama `redeChart()` — o que muda
 * entre eles esta no `data.json`, nao em codigo.
 *
 * ## Layout publicado e fisica ao mesmo tempo
 *
 * Os layouts do igraph (`fr`, `drl`) sao estocasticos: deixar uma simulacao de
 * forcas resolver o desenho no navegador daria uma rede diferente do
 * `output.png` a cada carga, e a regra do acervo e que as duas versoes sejam a
 * mesma figura. Mas uma rede sem fisica perde o que ela tem de melhor —
 * puxar um no e ver a vizinhanca reagir.
 *
 * As duas coisas convivem assim:
 *
 * 1. O R resolve o layout uma vez, desenha a imagem com ele e exporta as
 *    coordenadas. A simulacao e criada **parada** (`stop()`) com os nos ja
 *    nessas posicoes — a pagina abre exatamente na figura publicada.
 * 2. A simulacao so esquenta quando o usuario arrasta um no. Ai sim as
 *    vizinhancas reagem, com a elasticidade que se espera de um grafo.
 * 3. Cada no e ancorado a sua posicao de origem por uma forca fraca
 *    (`forceX`/`forceY` em `x0`/`y0`), e o comprimento de repouso de cada
 *    aresta e a distancia que ela tem no layout original. Ou seja: a figura
 *    publicada e um ponto de equilibrio da simulacao. O arrasto deforma
 *    localmente e a rede tende a voltar pra ela, em vez de derivar pra um
 *    desenho qualquer.
 */

import {
  select,
  scaleLinear,
  drag,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../motion';
import type { DrawContext, VizChart } from '../types';

export interface DadosRede {
  meta: {
    /** Chaves de layout disponiveis em `no.pos`. Uma so = grafico de layout fixo. */
    layouts: string[];
    rotulosLayout?: Record<string, string>;
    /** Raio minimo e maximo do no, em px na tela. */
    raio: [number, number];
    aresta: { cor: string; opacidade: number; largura: number };
    dirigido?: boolean;
    /** Texto curto abaixo do grafico explicando a codificacao de cor/tamanho. */
    nota?: string;
  };
  nos: NoBruto[];
  arestas: Aresta[];
}

export interface NoBruto {
  id: string;
  cor: string;
  /** Tamanho relativo em [0,1] — o modulo mapeia pro intervalo de raio. */
  t: number;
  /** Posicao normalizada em [0,1] por layout. */
  pos: Record<string, [number, number]>;
  titulo: string;
}

export interface Aresta {
  de: string;
  para: string;
  peso?: number;
}

/** No ja resolvido em coordenada de tela e participando da simulacao. */
interface No extends SimulationNodeDatum, NoBruto {
  x: number;
  y: number;
  r: number;
  /** Posicao de origem (a do output.png) — ancora da simulacao. */
  x0: number;
  y0: number;
}

/** Aresta no formato que o `forceLink` consome. */
interface Ligacao {
  source: No | string;
  target: No | string;
  peso?: number;
}

const VB = 900;
const OPACIDADE_APAGADA = 0.12;
/** Quanto cada no puxa de volta pra sua posicao publicada. */
const FORCA_ANCORA = 0.14;
/** Alvo de "temperatura" enquanto o usuario arrasta. */
const CALOR_ARRASTO = 0.3;

const comoNo = (v: No | string): No => v as No;

export interface OpcoesRede {
  label: string;
  aspectRatio?: number;
}

export function redeChart({ label, aspectRatio = 1 }: OpcoesRede): VizChart {
  return {
    aspectRatio,
    label,

    draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
      const { meta, nos, arestas } = data as DadosRede;
      const escala = VB / Math.max(width, 1);
      const px = (v: number) => v * escala;
      const alturaVB = VB / aspectRatio;

      // Margem = maior raio possivel, senao o no da borda sai cortado pela metade.
      const margem = px(meta.raio[1]) + px(4);
      // Os dois eixos compartilham a mesma escala, sobre um quadrado centrado:
      // esticar cada eixo ate preencher o quadro deformaria a rede em relacao
      // ao output.png (o R ja exporta as posicoes com a proporcao preservada).
      const lado = Math.min(VB, alturaVB) - 2 * margem;
      const offX = (VB - lado) / 2;
      const offY = (alturaVB - lado) / 2;
      const mapX = scaleLinear().domain([0, 1]).range([offX, offX + lado]);
      const mapY = scaleLinear().domain([0, 1]).range([offY + lado, offY]);
      const raio = scaleLinear().domain([0, 1]).range([px(meta.raio[0]), px(meta.raio[1])]);

      let layoutAtual = meta.layouts[0];

      const posicaoDe = (n: NoBruto, layout: string): [number, number] => {
        const p = n.pos[layout] ?? n.pos[meta.layouts[0]];
        return [mapX(p[0]), mapY(p[1])];
      };

      const estado: No[] = nos.map((n) => {
        const [x, y] = posicaoDe(n, layoutAtual);
        return { ...n, x, y, x0: x, y0: y, r: raio(n.t) };
      });
      const porId = new Map(estado.map((n) => [n.id, n]));

      const ligacoes: Ligacao[] = arestas.map((a) => ({
        source: a.de,
        target: a.para,
        peso: a.peso,
      }));

      // Vizinhanca pre-calculada: o realce no hover precisa responder na hora,
      // e varrer as arestas a cada movimento do ponteiro num grafo denso custa.
      const vizinhos = new Map<string, Set<string>>();
      for (const n of estado) vizinhos.set(n.id, new Set([n.id]));
      for (const a of arestas) {
        vizinhos.get(a.de)?.add(a.para);
        vizinhos.get(a.para)?.add(a.de);
      }

      const svg = select(root)
        .append('svg')
        .attr('viewBox', `0 0 ${VB} ${alturaVB}`)
        .attr('aria-hidden', 'true');

      const camadaArestas = svg.append('g');
      const camadaNos = svg.append('g');

      const linhas = camadaArestas
        .selectAll<SVGLineElement, Ligacao>('line')
        .data(ligacoes)
        .join('line')
        .attr('stroke', meta.aresta.cor)
        .attr('stroke-opacity', meta.aresta.opacidade)
        .attr('stroke-width', (l) => px(meta.aresta.largura) * (l.peso ?? 1));

      const circulos = camadaNos
        .selectAll<SVGCircleElement, No>('circle')
        .data(estado, (n) => n.id)
        .join('circle')
        .attr('r', (n) => n.r)
        .attr('fill', (n) => n.cor)
        .attr('data-interactive', '');

      const desenharPosicoes = () => {
        circulos.attr('cx', (n) => n.x).attr('cy', (n) => n.y);
        linhas
          .attr('x1', (l) => comoNo(l.source).x)
          .attr('y1', (l) => comoNo(l.source).y)
          .attr('x2', (l) => comoNo(l.target).x)
          .attr('y2', (l) => comoNo(l.target).y);
      };

      // ------------------------------------------------------------- simulacao
      // Comprimento de repouso = distancia que a aresta ja tem no layout
      // publicado. E o que torna esse layout um equilibrio da simulacao, em vez
      // de um ponto de partida que ela vai desmanchar no primeiro tick.
      const distanciaOriginal = (l: Ligacao) => {
        const a = porId.get(typeof l.source === 'string' ? l.source : l.source.id)!;
        const b = porId.get(typeof l.target === 'string' ? l.target : l.target.id)!;
        return Math.hypot(a.x0 - b.x0, a.y0 - b.y0);
      };

      const sim: Simulation<No, Ligacao> = forceSimulation<No>(estado)
        .force(
          'link',
          forceLink<No, Ligacao>(ligacoes)
            .id((n) => n.id)
            .distance(distanciaOriginal)
            .strength(0.35)
        )
        .force('carga', forceManyBody<No>().strength(-18))
        .force(
          'colisao',
          forceCollide<No>().radius((n) => n.r + px(1.5))
        )
        .force('ancoraX', forceX<No>((n) => n.x0).strength(FORCA_ANCORA))
        .force('ancoraY', forceY<No>((n) => n.y0).strength(FORCA_ANCORA))
        .on('tick', desenharPosicoes)
        // Nasce parada: o primeiro quadro tem que ser a figura publicada.
        .stop();

      desenharPosicoes();

      // ------------------------------------------------------------- realce
      const realcar = (id: string | null) => {
        const perto = id ? vizinhos.get(id)! : null;
        circulos
          .transition()
          .duration(DURATION.fast)
          .ease(EASE_STATE)
          .attr('fill-opacity', (n) => (!perto || perto.has(n.id) ? 1 : OPACIDADE_APAGADA));
        linhas
          .transition()
          .duration(DURATION.fast)
          .ease(EASE_STATE)
          .attr('stroke-opacity', (l) => {
            if (!perto) return meta.aresta.opacidade;
            const dentro = perto.has(comoNo(l.source).id) && perto.has(comoNo(l.target).id);
            return dentro ? 0.85 : meta.aresta.opacidade * 0.35;
          });
      };

      circulos
        .on('pointerenter', (evento: PointerEvent, n) => {
          realcar(n.id);
          tooltip.show(n.titulo, evento);
        })
        .on('pointermove', (evento: PointerEvent, n) => tooltip.show(n.titulo, evento))
        .on('pointerleave', () => {
          realcar(null);
          tooltip.hide();
        });

      // ------------------------------------------------------------- arrasto
      // Aqui a simulacao esquenta. Enquanto o no esta preso ao ponteiro
      // (`fx`/`fy`), os vizinhos reagem pelas arestas; ao soltar, a rede
      // reassenta puxada pelas ancoras.
      circulos.call(
        drag<SVGCircleElement, No>()
          .on('start', (evento, n) => {
            tooltip.hide();
            if (!evento.active) sim.alphaTarget(CALOR_ARRASTO).restart();
            n.fx = n.x;
            n.fy = n.y;
          })
          .on('drag', (evento, n) => {
            n.fx = evento.x;
            n.fy = evento.y;
          })
          .on('end', (evento, n) => {
            if (!evento.active) sim.alphaTarget(0);
            n.fx = null;
            n.fy = null;
          }) as never
      );

      // ------------------------------------------------------------ controles
      const controles = select(root).append('div').attr('class', 'viz-controles');

      if (meta.layouts.length > 1) {
        controles
          .selectAll('button.layout')
          .data(meta.layouts)
          .join('button')
          .attr('class', 'layout')
          .attr('type', 'button')
          .attr('data-interactive', '')
          .attr('aria-pressed', (l) => String(l === layoutAtual))
          .text((l) => meta.rotulosLayout?.[l] ?? l)
          .on('click', (_e, l) => {
            if (l === layoutAtual) return;
            layoutAtual = l;
            controles.selectAll('button.layout').attr('aria-pressed', (d) => String(d === l));
            irPara(l);
          });
      }

      controles
        .append('button')
        .attr('type', 'button')
        .attr('data-interactive', '')
        .text('Restaurar layout')
        .on('click', () => irPara(layoutAtual));

      /**
       * Leva a rede pras posicoes de um layout e volta a ancorar nelas.
       * Serve tanto pra trocar de layout quanto pra desfazer o que o arrasto
       * bagunçou — sem isso nao haveria caminho de volta pra figura publicada.
       */
      function irPara(layout: string) {
        sim.alphaTarget(0).stop();
        estado.forEach((n) => {
          const [x, y] = posicaoDe(n, layout);
          n.x0 = x;
          n.y0 = y;
          n.fx = null;
          n.fy = null;
        });

        // O mesmo grafo se reorganizando é a comparação: ver o nó sair de uma
        // posição e chegar na outra diz mais do que dois desenhos lado a lado.
        circulos
          .transition()
          .duration(DURATION.slow)
          .ease(EASE_STATE)
          .attrTween('cx', (n) => {
            const de = n.x;
            return (t) => String((n.x = de + (n.x0 - de) * t));
          })
          .attrTween('cy', (n) => {
            const de = n.y;
            return (t) => String((n.y = de + (n.y0 - de) * t));
          })
          .on('end.linhas', null);

        // As arestas seguem os nós quadro a quadro durante a transição.
        const inicio = performance.now();
        const seguir = () => {
          desenharPosicoes();
          if (performance.now() - inicio < DURATION.slow + 40) requestAnimationFrame(seguir);
        };
        requestAnimationFrame(seguir);

        garantirEstadoFinal(DURATION.slow, () => {
          circulos.interrupt();
          estado.forEach((n) => {
            n.x = n.x0;
            n.y = n.y0;
          });
          desenharPosicoes();
        });
      }

      if (meta.nota) {
        select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
      }

      // ------------------------------------------------------------- entrada
      // Os nós crescem do próprio lugar e as arestas aparecem depois: primeiro
      // se lê onde estão as coisas, só então como se ligam.
      if (animate) {
        const ESCALONAMENTO = 320;

        circulos
          .attr('r', 0)
          .transition()
          .delay((_n, i) => stagger(i, estado.length, ESCALONAMENTO))
          .duration(DURATION.enter)
          .ease(EASE_ENTER)
          .attr('r', (n) => n.r);

        linhas
          .attr('stroke-opacity', 0)
          .transition()
          .delay(DURATION.enter * 0.5)
          .duration(DURATION.enter)
          .attr('stroke-opacity', meta.aresta.opacidade);

        // A entrada parte de raio 0, entao sem esta garantia um renderer que
        // nao compoe frames deixaria a rede inteira invisivel.
        garantirEstadoFinal(ESCALONAMENTO + DURATION.enter * 1.5, () => {
          circulos.interrupt().attr('r', (n) => n.r);
          linhas.interrupt().attr('stroke-opacity', meta.aresta.opacidade);
        });
      }
    },
  };
}
