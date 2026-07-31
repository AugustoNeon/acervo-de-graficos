/**
 * Modulo de rede compartilhado.
 *
 * Serve os cinco graficos de rede do acervo. Cada um deles vira um arquivo de
 * poucas linhas em `charts/network/`, que so chama `redeChart()` — o que muda
 * entre eles esta no `data.json`, nao em codigo.
 *
 * **As posicoes vem prontas do R, e nao de uma simulacao aqui.** Os layouts do
 * igraph (`fr`, `drl`) sao estocasticos: rodar `d3.forceSimulation()` no
 * navegador produziria um desenho diferente do `output.png` a cada carga, e a
 * regra do acervo e que as duas versoes sejam a mesma figura. O R resolve o
 * layout uma vez, desenha a imagem com ele e exporta as mesmas coordenadas.
 *
 * O que sobra pra ca e o que a imagem nao faz: entrada animada, realce da
 * vizinhanca de um no, arrasto, e — quando o data.json traz mais de um layout —
 * transicao animada entre eles.
 */

import { select, scaleLinear, drag } from 'd3';
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

/** No do data.json ja resolvido em coordenada de tela. */
type No = NoBruto & { x: number; y: number; r: number };

const VB = 900;
const OPACIDADE_APAGADA = 0.12;

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

      const posicionar = (n: NoBruto, layout: string): [number, number] => {
        const p = n.pos[layout] ?? n.pos[meta.layouts[0]];
        return [mapX(p[0]), mapY(p[1])];
      };

      const estado: No[] = nos.map((n) => {
        const [x, y] = posicionar(n, layoutAtual);
        return { ...n, x, y, r: raio(n.t) };
      });
      const porId = new Map(estado.map((n) => [n.id, n]));

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
        .selectAll<SVGLineElement, Aresta>('line')
        .data(arestas)
        .join('line')
        .attr('stroke', meta.aresta.cor)
        .attr('stroke-opacity', meta.aresta.opacidade)
        .attr('stroke-width', (a) => px(meta.aresta.largura) * (a.peso ?? 1))
        .attr('x1', (a) => porId.get(a.de)!.x)
        .attr('y1', (a) => porId.get(a.de)!.y)
        .attr('x2', (a) => porId.get(a.para)!.x)
        .attr('y2', (a) => porId.get(a.para)!.y);

      const circulos = camadaNos
        .selectAll<SVGCircleElement, No>('circle')
        .data(estado, (n) => n.id)
        .join('circle')
        .attr('cx', (n) => n.x)
        .attr('cy', (n) => n.y)
        .attr('r', (n) => n.r)
        .attr('fill', (n) => n.cor)
        .attr('data-interactive', '');

      const reposicionar = () => {
        circulos.attr('cx', (n) => n.x).attr('cy', (n) => n.y);
        linhas
          .attr('x1', (a) => porId.get(a.de)!.x)
          .attr('y1', (a) => porId.get(a.de)!.y)
          .attr('x2', (a) => porId.get(a.para)!.x)
          .attr('y2', (a) => porId.get(a.para)!.y);
      };

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
          .attr('stroke-opacity', (a) =>
            !perto
              ? meta.aresta.opacidade
              : perto.has(a.de) && perto.has(a.para)
                ? 0.85
                : meta.aresta.opacidade * 0.35
          );
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
      // Arrastar um no e o que permite desemaranhar um trecho da rede na mao,
      // que e a razao de existir da versao interativa num grafo denso.
      circulos.call(
        drag<SVGCircleElement, No>()
          .on('start', () => tooltip.hide())
          .on('drag', (evento, n) => {
            n.x = evento.x;
            n.y = evento.y;
            reposicionar();
          }) as never
      );

      // ------------------------------------------- alternancia entre layouts
      if (meta.layouts.length > 1) {
        const controles = select(root).append('div').attr('class', 'viz-controles');
        controles
          .selectAll('button')
          .data(meta.layouts)
          .join('button')
          .attr('type', 'button')
          .attr('data-interactive', '')
          .attr('aria-pressed', (l) => String(l === layoutAtual))
          .text((l) => meta.rotulosLayout?.[l] ?? l)
          .on('click', function (_e, l) {
            if (l === layoutAtual) return;
            layoutAtual = l;
            controles.selectAll('button').attr('aria-pressed', (d) => String(d === l));

            // O mesmo grafo se reorganizando é a comparação: ver o nó sair de
            // uma posição e chegar na outra diz mais do que dois desenhos
            // lado a lado.
            estado.forEach((n) => {
              const [x, y] = posicionar(n, l);
              n.x = x;
              n.y = y;
            });
            circulos
              .transition()
              .duration(DURATION.slow)
              .ease(EASE_STATE)
              .attr('cx', (n) => n.x)
              .attr('cy', (n) => n.y);
            linhas
              .transition()
              .duration(DURATION.slow)
              .ease(EASE_STATE)
              .attr('x1', (a) => porId.get(a.de)!.x)
              .attr('y1', (a) => porId.get(a.de)!.y)
              .attr('x2', (a) => porId.get(a.para)!.x)
              .attr('y2', (a) => porId.get(a.para)!.y);
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
