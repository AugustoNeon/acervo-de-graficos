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
 * 2. A simulacao so esquenta quando o usuario arrasta um no.
 * 3. Cada no e ancorado a sua posicao de origem por uma forca fraca, e o
 *    comprimento de repouso de cada aresta e a distancia que ela tem no layout
 *    original. Ou seja: a figura publicada e um ponto de equilibrio da
 *    simulacao, e o arrasto deforma localmente em vez de desmanchar tudo.
 *
 * ## Multi-painel
 *
 * Dois graficos do acervo mostram o MESMO grafo em paineis lado a lado (dois
 * tipos de conexao; tres algoritmos de layout). Cada painel e uma rede
 * independente, com a propria simulacao — mas o realce e **ligado**: passar o
 * cursor num no o destaca em todos os paineis ao mesmo tempo. Rastrear onde o
 * mesmo no foi parar em cada painel e exatamente a leitura que esses graficos
 * pedem, e que a imagem estatica nao consegue dar.
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
  type Selection,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../motion';
import { tornarFixavel } from './interacao';
import type { DrawContext, VizChart } from '../types';

export interface EstiloAresta {
  cor: string;
  opacidade: number;
  largura: number;
}

export interface Painel {
  /** Titulo acima do painel. Ausente num grafico de painel unico. */
  titulo?: string;
  /** Qual conjunto de posicoes de `no.pos` este painel usa. */
  layout: string;
  /** Sobrescreve o estilo de aresta so neste painel. */
  aresta?: Partial<EstiloAresta>;
  dirigido?: boolean;
  /** Usa a largura/opacidade por aresta do data.json. Default: usa. */
  ignorarPesoDaAresta?: boolean;
}

export interface DadosRede {
  meta: {
    /** Compatibilidade: graficos de painel unico so declaram o layout aqui. */
    layouts?: string[];
    paineis?: Painel[];
    /** Raio minimo e maximo do no, em px na tela. */
    raio: [number, number];
    aresta: EstiloAresta;
    dirigido?: boolean;
    /** Texto curto abaixo do grafico explicando a codificacao. */
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
  /** Nome desenhado ao lado do no. Ausente = no sem rotulo. */
  rotulo?: string;
}

export interface Aresta {
  de: string;
  para: string;
  /**
   * Largura e opacidade ja resolvidas pelo R quando a aresta codifica peso.
   * Vem prontas em vez de serem recalculadas aqui pelo mesmo motivo das
   * posicoes: o ggplot tem sistema de escalas e o D3 nao, e reimplementar
   * `scale_edge_width`/`scale_edge_alpha` do outro lado e a forma mais comum
   * de as duas versoes divergirem.
   */
  largura?: number;
  opacidade?: number;
  titulo?: string;
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

interface Ligacao {
  source: No | string;
  target: No | string;
  largura?: number;
  opacidade?: number;
  /**
   * -1, 0 ou +1. Duas rotas entre o mesmo par de nos (ida e volta) desenhadas
   * como reta se sobrepoem exatamente e uma das direcoes desaparece — e o que
   * o `geom_edge_fan` do ggraph resolve abrindo as duas em leque. Aqui cada
   * uma das duas recebe uma curvatura de sinal oposto.
   */
  curva?: number;
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
  /** Proporcao do conjunto todo (todos os paineis juntos). */
  aspectRatio?: number;
}

export function redeChart({ label, aspectRatio = 1 }: OpcoesRede): VizChart {
  return {
    aspectRatio,
    label,

    draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
      const { meta, nos, arestas } = data as DadosRede;

      const paineis: Painel[] =
        meta.paineis && meta.paineis.length > 0
          ? meta.paineis
          : [{ layout: meta.layouts?.[0] ?? 'fr', dirigido: meta.dirigido }];

      const raiz = select(root).append('div').attr('class', 'viz-paineis');
      if (paineis.length > 1) raiz.attr('data-colunas', paineis.length);

      // Cada painel ocupa uma fracao da largura, e o texto dentro do SVG e
      // dimensionado por ela — senao o rotulo encolhe junto com o painel.
      const larguraPainel = Math.max(width / paineis.length, 1);

      const montados = paineis.map((painel) =>
        montarPainel({
          hospedeiro: raiz.append('div').attr('class', 'viz-painel'),
          painel,
          meta,
          nos,
          arestas,
          largura: larguraPainel,
          theme,
          tooltip,
          animate,
          mostrarTitulo: paineis.length > 1,
        })
      );

      // Realce ligado: o mesmo no acende em todos os paineis. Clicar num no
      // fixa o realce (em todos os paineis ao mesmo tempo) ate um novo
      // clique nele ou um clique fora do grafico.
      tornarFixavel(
        root,
        montados.map((m) => ({ selecao: m.circulos, chaveDe: (n: { id: string }) => n.id })),
        (id) => montados.forEach((m) => m.realcar(id)),
        () => montados.forEach((m) => m.realcar(null))
      );

      const controles = select(root).append('div').attr('class', 'viz-controles');
      controles
        .append('button')
        .attr('type', 'button')
        .attr('data-interactive', '')
        .text(paineis.length > 1 ? 'Restaurar layouts' : 'Restaurar layout')
        .on('click', () => montados.forEach((m) => m.restaurar()));

      if (meta.nota) {
        select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
      }
    },
  };
}

interface OpcoesPainel {
  hospedeiro: Selection<HTMLDivElement, unknown, null, undefined>;
  painel: Painel;
  meta: DadosRede['meta'];
  nos: NoBruto[];
  arestas: Aresta[];
  largura: number;
  theme: DrawContext['theme'];
  tooltip: DrawContext['tooltip'];
  animate: boolean;
  mostrarTitulo: boolean;
}

interface PainelMontado {
  realcar(id: string | null): void;
  /** Selecao dos nos deste painel — usada por fora pra fixar o realce entre paineis. */
  circulos: Selection<SVGCircleElement, No, any, any>;
  restaurar(): void;
}

function montarPainel({
  hospedeiro,
  painel,
  meta,
  nos,
  arestas,
  largura,
  theme,
  tooltip,
  animate,
  mostrarTitulo,
}: OpcoesPainel): PainelMontado {
  const escala = VB / largura;
  const px = (v: number) => v * escala;

  const estilo: EstiloAresta = { ...meta.aresta, ...painel.aresta };
  const dirigido = painel.dirigido ?? meta.dirigido === true;
  const usarPeso = !painel.ignorarPesoDaAresta;

  if (mostrarTitulo && painel.titulo) {
    hospedeiro
      .append('p')
      .attr('class', 'viz-painel-titulo')
      .text(painel.titulo);
  }

  const alvo = hospedeiro.append('div');

  const margem = px(meta.raio[1]) + px(4);
  // Os dois eixos compartilham a mesma escala, sobre um quadrado centrado:
  // esticar cada eixo ate preencher o quadro deformaria a rede em relacao ao
  // output.png (o R ja exporta as posicoes com a proporcao preservada).
  const lado = VB - 2 * margem;
  const mapX = scaleLinear().domain([0, 1]).range([margem, margem + lado]);
  const mapY = scaleLinear().domain([0, 1]).range([margem + lado, margem]);
  const raio = scaleLinear().domain([0, 1]).range([px(meta.raio[0]), px(meta.raio[1])]);

  const posicaoDe = (n: NoBruto): [number, number] => {
    const p = n.pos[painel.layout] ?? Object.values(n.pos)[0];
    return [mapX(p[0]), mapY(p[1])];
  };

  const estado: No[] = nos.map((n) => {
    const [x, y] = posicaoDe(n);
    return { ...n, x, y, x0: x, y0: y, r: raio(n.t) };
  });
  const porId = new Map(estado.map((n) => [n.id, n]));

  const ligacoes: Ligacao[] = arestas.map((a) => ({
    source: a.de,
    target: a.para,
    largura: usarPeso ? a.largura : undefined,
    opacidade: usarPeso ? a.opacidade : undefined,
  }));

  const larguraDa = (l: Ligacao) => px(l.largura ?? estilo.largura);
  const opacidadeDe = (l: Ligacao) => l.opacidade ?? estilo.opacidade;

  // Marca os pares reciprocos pra abrir as duas rotas em leque.
  const vistos = new Set<string>();
  for (const l of ligacoes) {
    const a = l.source as string;
    const b = l.target as string;
    if (vistos.has(`${b} ${a}`)) {
      l.curva = -1;
      const oposta = ligacoes.find((o) => o.source === b && o.target === a);
      if (oposta) oposta.curva = 1;
    }
    vistos.add(`${a} ${b}`);
  }

  // Vizinhanca pre-calculada: o realce no hover precisa responder na hora, e
  // varrer as arestas a cada movimento do ponteiro num grafo denso custa.
  const vizinhos = new Map<string, Set<string>>();
  for (const n of estado) vizinhos.set(n.id, new Set([n.id]));
  for (const a of arestas) {
    vizinhos.get(a.de)?.add(a.para);
    vizinhos.get(a.para)?.add(a.de);
  }

  const svg = alvo
    .append('svg')
    .attr('viewBox', `0 0 ${VB} ${VB}`)
    .attr('aria-hidden', 'true');

  const camadaArestas = svg.append('g');
  const camadaPontas = svg.append('g');
  const camadaNos = svg.append('g');
  const camadaRotulos = svg.append('g');

  const PONTA_COMPRIMENTO = px(8);
  const PONTA_LARGURA = px(4);

  const traco = (l: Ligacao) => {
    const a = comoNo(l.source);
    const b = comoNo(l.target);
    const curva = l.curva ?? 0;
    // Ponto de controle deslocado perpendicularmente ao meio do segmento.
    const cx = (a.x + b.x) / 2 - (b.y - a.y) * 0.16 * curva;
    const cy = (a.y + b.y) / 2 + (b.x - a.x) * 0.16 * curva;
    // A seta segue a tangente da chegada, que numa quadratica e P2 - P1 —
    // usar a corda deixaria a ponta torta em relacao a curva.
    const tx = b.x - cx;
    const ty = b.y - cy;
    const t = Math.hypot(tx, ty) || 1;
    const ux = tx / t;
    const uy = ty / t;
    // Num grafo dirigido a linha para na borda do no de destino, e nao no
    // centro: e o equivalente ao `end_cap` do ggraph.
    const recuo = dirigido ? b.r + PONTA_COMPRIMENTO : 0;
    return { x1: a.x, y1: a.y, cx, cy, x2: b.x - ux * recuo, y2: b.y - uy * recuo, ux, uy, curva };
  };

  const caminhoDa = (l: Ligacao) => {
    const s = traco(l);
    return s.curva
      ? `M${s.x1},${s.y1}Q${s.cx},${s.cy} ${s.x2},${s.y2}`
      : `M${s.x1},${s.y1}L${s.x2},${s.y2}`;
  };

  const linhas = camadaArestas
    .selectAll<SVGPathElement, Ligacao>('path')
    .data(ligacoes)
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', estilo.cor)
    .attr('stroke-opacity', opacidadeDe)
    .attr('stroke-width', larguraDa)
    .attr('stroke-linecap', 'round');

  // Pontas desenhadas como poligono, e nao como <marker>: um marker so aceita
  // uma cor por definicao, e aqui cada aresta tem a sua opacidade.
  const pontas = dirigido
    ? camadaPontas
        .selectAll<SVGPathElement, Ligacao>('path')
        .data(ligacoes)
        .join('path')
        .attr('fill', estilo.cor)
        .attr('fill-opacity', opacidadeDe)
    : null;

  const circulos = camadaNos
    .selectAll<SVGCircleElement, No>('circle')
    .data(estado, (n) => n.id)
    .join('circle')
    .attr('r', (n) => n.r)
    .attr('fill', (n) => n.cor)
    .attr('data-interactive', '');

  const rotulos = camadaRotulos
    .selectAll<SVGTextElement, No>('text')
    .data(
      estado.filter((n) => n.rotulo),
      (n) => n.id
    )
    .join('text')
    .attr('text-anchor', 'middle')
    .attr('font-family', theme.fontBody)
    .attr('font-size', px(13))
    .attr('font-weight', 600)
    .attr('fill', theme.ink)
    // Contorno da cor do fundo por baixo do texto: sem isso o rotulo fica
    // ilegivel quando cai em cima de uma aresta.
    .attr('paint-order', 'stroke')
    .attr('stroke', theme.bg)
    .attr('stroke-width', px(3))
    .attr('stroke-linejoin', 'round')
    .text((n) => n.rotulo!);

  const desenharPosicoes = () => {
    circulos.attr('cx', (n) => n.x).attr('cy', (n) => n.y);
    linhas.attr('d', caminhoDa);
    pontas?.attr('d', (l) => {
      const { x2, y2, ux, uy } = traco(l);
      const bx = x2 + ux * PONTA_COMPRIMENTO;
      const by = y2 + uy * PONTA_COMPRIMENTO;
      return (
        `M${bx},${by}` +
        `L${x2 - uy * PONTA_LARGURA},${y2 + ux * PONTA_LARGURA}` +
        `L${x2 + uy * PONTA_LARGURA},${y2 - ux * PONTA_LARGURA}Z`
      );
    });
    rotulos.attr('x', (n) => n.x).attr('y', (n) => n.y - n.r - px(6));
  };

  // ---------------------------------------------------------------- simulacao
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

  // ------------------------------------------------------------------ realce
  const realcar = (id: string | null) => {
    const perto = id ? vizinhos.get(id) : null;
    circulos
      .transition()
      .duration(DURATION.fast)
      .ease(EASE_STATE)
      .attr('fill-opacity', (n) => (!perto || perto.has(n.id) ? 1 : OPACIDADE_APAGADA));

    const opacidadeComFoco = (l: Ligacao) => {
      if (!perto) return opacidadeDe(l);
      const dentro = perto.has(comoNo(l.source).id) && perto.has(comoNo(l.target).id);
      return dentro ? Math.max(0.85, opacidadeDe(l)) : opacidadeDe(l) * 0.3;
    };

    linhas.transition().duration(DURATION.fast).ease(EASE_STATE).attr('stroke-opacity', opacidadeComFoco);
    pontas?.transition().duration(DURATION.fast).ease(EASE_STATE).attr('fill-opacity', opacidadeComFoco);
    rotulos
      .transition()
      .duration(DURATION.fast)
      .ease(EASE_STATE)
      .attr('opacity', (n) => (!perto || perto.has(n.id) ? 1 : 0.25));
  };

  // Realce (hover puro e fixar por clique) e amarrado por fora, no nivel do
  // redeChart — precisa enxergar os circulos de TODOS os paineis pra fixar
  // em conjunto. Aqui so cuida do tooltip, que e sempre por-painel.
  circulos
    .on('pointermove', (evento: PointerEvent, n) => tooltip.show(n.titulo, evento))
    .on('pointerleave', () => tooltip.hide());

  // ----------------------------------------------------------------- arrasto
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

  /** Devolve a rede pras posicoes publicadas — o caminho de volta do arrasto. */
  function restaurar() {
    sim.alphaTarget(0).stop();
    estado.forEach((n) => {
      n.fx = null;
      n.fy = null;
    });

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
      });

    // Arestas e rotulos seguem os nos quadro a quadro durante a transicao.
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

  // ----------------------------------------------------------------- entrada
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
      .attr('stroke-opacity', opacidadeDe);

    pontas
      ?.attr('fill-opacity', 0)
      .transition()
      .delay(DURATION.enter * 0.5)
      .duration(DURATION.enter)
      .attr('fill-opacity', opacidadeDe);

    rotulos
      .attr('opacity', 0)
      .transition()
      .delay(DURATION.enter * 0.6)
      .duration(DURATION.base)
      .attr('opacity', 1);

    // A entrada parte de raio 0, entao sem esta garantia um renderer que nao
    // compoe frames deixaria a rede inteira invisivel.
    garantirEstadoFinal(ESCALONAMENTO + DURATION.enter * 1.5, () => {
      circulos.interrupt().attr('r', (n) => n.r);
      linhas.interrupt().attr('stroke-opacity', opacidadeDe);
      pontas?.interrupt().attr('fill-opacity', opacidadeDe);
      rotulos.interrupt().attr('opacity', 1);
    });
  }

  return {
    realcar,
    circulos,
    restaurar,
  };
}
