/**
 * Matriz de adjacência — a mesma rede dos outros gráficos desta categoria,
 * desenhada como grade em vez de nós e linhas.
 *
 * Uma matriz não tem layout pra calcular: não há simulação de força, nem
 * posição a convergir. O que ela tem é uma **ordem**, e a ordem decide tudo.
 * Com as tags agrupadas por afinidade, as comunidades aparecem como blocos
 * escuros na diagonal; em ordem alfabética, exatamente os mesmos números viram
 * ruído espalhado. Por isso o controle de ordenação aqui não é um extra: é o
 * equivalente, para a matriz, do que o layout é para um diagrama de nós.
 *
 * A cor de cada célula vem calculada do `script.R`. Recalculá-la aqui exigiria
 * repetir a rampa e o mapeamento, que é justamente como as duas versões de um
 * gráfico acabam divergindo de paleta.
 */

import { select, scaleBand, type Selection } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Celula {
  a: string;
  b: string;
  /** `null` na diagonal: uma tag não coocorre consigo mesma. */
  peso: number | null;
  cor: string;
}

interface Dados {
  meta: {
    tags: string[];
    grupos: Record<string, string>;
    nomesGrupos: string[];
    grau: Record<string, number>;
    pesoMaximo: number;
    paleta: { zero: string; diagonal: string; escala: string[] };
    nota?: string;
  };
  celulas: Celula[];
}

type OrdemId = 'grupo' | 'alfabetica' | 'grau';

const ORDENS: { id: OrdemId; rotulo: string }[] = [
  { id: 'grupo', rotulo: 'Afinidade' },
  { id: 'grau', rotulo: 'Nº de conexões' },
  { id: 'alfabetica', rotulo: 'A–Z' },
];

type MetadeId = 'completa' | 'triangular';

const METADES: { id: MetadeId; rotulo: string }[] = [
  { id: 'completa', rotulo: 'Completa' },
  { id: 'triangular', rotulo: 'Só uma metade' },
];

const VB_W = 900;
const VB_H = 880;
const MARGEM = { topo: 14, dir: 18, baixo: 152, esq: 172 };

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Matriz de adjacência da coocorrência de tags num fórum de tecnologia: cada célula é um par de ' +
    'tags, mais escura quanto mais posts elas dividem, com as tags reordenáveis para revelar os ' +
    'blocos de comunidade.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, celulas } = data as Dados;
    const { tags, grupos, grau, paleta, pesoMaximo } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const lado = Math.min(VB_W - MARGEM.esq - MARGEM.dir, VB_H - MARGEM.topo - MARGEM.baixo);

    // Mesma escala nos dois eixos, mesma ordem: é isso que põe a diagonal no
    // canto superior esquerdo e mantém a matriz simétrica em torno dela.
    const posicao = scaleBand<string>().domain(tags).range([0, lado]).padding(0.06);

    function ordenar(id: OrdemId): string[] {
      if (id === 'alfabetica') return [...tags].sort((x, y) => x.localeCompare(y, 'pt-BR'));
      if (id === 'grau') return [...tags].sort((x, y) => grau[y] - grau[x]);
      // "Afinidade" é a ordem em que o R já entregou as tags: agrupadas por
      // comunidade. Não é um cálculo de clusterização feito aqui — é o
      // agrupamento que gerou o dado, o que torna os blocos uma verificação
      // do dado, não uma descoberta do algoritmo.
      return tags;
    }

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gCelulas = g.append('g').attr('class', 'celulas');
    const gSeparadores = g.append('g').attr('class', 'separadores');
    const gRotulosY = g.append('g').attr('class', 'rotulos-y');
    const gRotulosX = g.append('g').attr('class', 'rotulos-x');

    const chave = (c: Celula) => `${c.a}__${c.b}`;

    const retangulos = gCelulas
      .selectAll<SVGRectElement, Celula>('rect')
      .data(celulas, chave)
      .join('rect')
      .attr('width', posicao.bandwidth())
      .attr('height', posicao.bandwidth())
      .attr('rx', px(2))
      .attr('fill', (c) => c.cor)
      .attr('data-interactive', '')
      .on('pointermove', (ev: PointerEvent, c: Celula) => tooltip.show(conteudoCelula(c), ev))
      .on('pointerleave', () => tooltip.hide());

    const rotulosY = gRotulosY
      .selectAll<SVGTextElement, string>('text')
      .data(tags)
      .join('text')
      .attr('x', -14)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .attr('data-interactive', '')
      .text((t) => t);

    const rotulosX = gRotulosX
      .selectAll<SVGTextElement, string>('text')
      .data(tags)
      .join('text')
      .attr('text-anchor', 'end')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .attr('data-interactive', '')
      .text((t) => t);

    // Separadores das fronteiras de grupo: três fronteiras (após a 4ª, a 8ª e a
    // 12ª tag), cada uma precisando de uma linha vertical E uma horizontal —
    // daí seis. Índices 0-2 são as verticais, 3-5 as horizontais.
    // Só fazem sentido na ordem por afinidade: nas outras, as tags de um grupo
    // ficam espalhadas e uma "fronteira" não separaria nada.
    const FRONTEIRAS = [4, 8, 12];
    const separadores = gSeparadores
      .selectAll<SVGLineElement, number>('line')
      .data([0, 1, 2, 3, 4, 5])
      .join('line')
      .attr('stroke', theme.borderStrong)
      .attr('stroke-width', px(1.2));

    function conteudoCelula(c: Celula): string {
      if (c.peso === null) {
        return (
          `<strong>${c.a}</strong> · ${grupos[c.a]}<br>` +
          `${grau[c.a]} posts em comum com outras tags<br>` +
          `<em>A diagonal fica vazia: uma tag não coocorre consigo mesma.</em>`
        );
      }
      const mesmoGrupo = grupos[c.a] === grupos[c.b];
      return (
        `<strong>${c.a} × ${c.b}</strong><br>` +
        `<span class="viz-swatch" style="background:${c.cor}"></span>` +
        `${c.peso} posts em comum<br>` +
        (mesmoGrupo ? `Mesmo grupo: ${grupos[c.a]}` : `${grupos[c.a]} × ${grupos[c.b]}`)
      );
    }

    let ordemAtual: OrdemId = 'grupo';
    let metadeAtual: MetadeId = 'completa';
    let realceTag: string | null = null;
    let realceCelula: Celula | null = null;
    let indice = new Map<string, number>();

    /** Uma célula é escondida no modo triangular se estiver acima da diagonal. */
    function ocultaPorMetade(c: Celula): boolean {
      return metadeAtual === 'triangular' && indice.get(c.a)! > indice.get(c.b)!;
    }

    function naCruz(c: Celula): boolean {
      if (realceCelula) return c.a === realceCelula.a || c.b === realceCelula.b;
      if (realceTag) return c.a === realceTag || c.b === realceTag;
      return true;
    }

    function tagAcesa(t: string): boolean {
      if (realceCelula) return t === realceCelula.a || t === realceCelula.b;
      if (realceTag) return t === realceTag;
      return true;
    }

    function aplicarRealce() {
      const ativo = realceTag !== null || realceCelula !== null;
      const t = <S extends Selection<any, any, any, any>>(s: S) => s.transition('realce').duration(DURATION.fast);

      // Dois fatores multiplicados de novo: esconder pela metade e esmaecer
      // pelo realce são independentes, e um `if` faria o realce reacender uma
      // célula que a metade tinha escondido.
      t(retangulos).attr('opacity', (c: Celula) => (ocultaPorMetade(c) ? 0 : !ativo || naCruz(c) ? 1 : 0.12));
      t(rotulosY)
        .attr('opacity', (tg: string) => (!ativo || tagAcesa(tg) ? 1 : 0.3))
        .attr('font-weight', (tg: string) => (ativo && tagAcesa(tg) ? 700 : 400));
      t(rotulosX)
        .attr('opacity', (tg: string) => (!ativo || tagAcesa(tg) ? 1 : 0.3))
        .attr('font-weight', (tg: string) => (ativo && tagAcesa(tg) ? 700 : 400));
    }

    function realcar(chaveRealce: string) {
      const [tipo, valor] = chaveRealce.split(':');
      if (tipo === 'celula') {
        const [a, b] = valor.split('__');
        realceCelula = celulas.find((c) => c.a === a && c.b === b) ?? null;
        realceTag = null;
      } else {
        realceTag = valor;
        realceCelula = null;
      }
      aplicarRealce();
    }

    function limpar() {
      realceTag = null;
      realceCelula = null;
      aplicarRealce();
    }

    function aplicar(ordem: OrdemId, metade: MetadeId, transicao: boolean) {
      ordemAtual = ordem;
      metadeAtual = metade;
      const sequencia = ordenar(ordem);
      posicao.domain(sequencia);
      indice = new Map(sequencia.map((t, i) => [t, i]));

      const dur = transicao ? DURATION.slow : 0;
      type ComoSelecao = Selection<any, any, any, any>;
      const t = (s: ComoSelecao): ComoSelecao =>
        transicao ? (s.transition().duration(dur).ease(EASE_STATE) as unknown as ComoSelecao) : s;

      const centro = (tg: string) => (posicao(tg) ?? 0) + posicao.bandwidth() / 2;

      t(retangulos)
        .attr('x', (c: Celula) => posicao(c.a) ?? 0)
        .attr('y', (c: Celula) => posicao(c.b) ?? 0);

      t(rotulosY).attr('y', (tg: string) => centro(tg));
      t(rotulosX).attr('transform', (tg: string) => `translate(${centro(tg)},${lado + 16}) rotate(-45)`);

      // Cada fronteira cai no espaço logo ANTES da primeira tag do grupo
      // seguinte — por isso o recuo de meio `padding` a partir da posição dela.
      const corte = (f: number) => (posicao(sequencia[f]) ?? 0) - (posicao.step() - posicao.bandwidth()) / 2;
      t(separadores)
        .attr('opacity', ordem === 'grupo' ? 0.9 : 0)
        .attr('x1', (i: number) => (i < 3 ? corte(FRONTEIRAS[i]) : 0))
        .attr('x2', (i: number) => (i < 3 ? corte(FRONTEIRAS[i]) : lado))
        .attr('y1', (i: number) => (i < 3 ? 0 : corte(FRONTEIRAS[i - 3])))
        .attr('y2', (i: number) => (i < 3 ? lado : corte(FRONTEIRAS[i - 3])));

      botoesOrdem.attr('aria-pressed', (o) => String(o.id === ordem));
      botoesMetade.attr('aria-pressed', (m) => String(m.id === metade));
      aplicarRealce();
    }

    const controlesOrdem = select(root).append('div').attr('class', 'viz-controles');
    controlesOrdem.append('span').attr('class', 'viz-controles-rotulo').text('Ordenar por');
    const botoesOrdem = controlesOrdem
      .selectAll<HTMLButtonElement, (typeof ORDENS)[number]>('button')
      .data(ORDENS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .text((o) => o.rotulo)
      .on('click', (_ev, o) => {
        if (o.id === ordemAtual) return;
        aplicar(o.id, metadeAtual, true);
      });

    const controlesMetade = select(root).append('div').attr('class', 'viz-controles');
    controlesMetade.append('span').attr('class', 'viz-controles-rotulo').text('Simetria');
    const botoesMetade = controlesMetade
      .selectAll<HTMLButtonElement, (typeof METADES)[number]>('button')
      .data(METADES)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .text((m) => m.rotulo)
      .on('click', (_ev, m) => {
        if (m.id === metadeAtual) return;
        aplicar(ordemAtual, m.id, true);
      });

    aplicar('grupo', 'completa', false);

    // Legenda em HTML, nunca dentro do <svg>: texto num viewBox que cresce com
    // o dado encolhe junto e fica ilegível.
    const legenda = select(root).append('div').attr('class', 'viz-legenda');
    const estiloTexto = `font-size:var(--text-sm);color:var(--color-ink-muted)`;
    legenda.append('span').attr('style', estiloTexto).text('0');
    legenda
      .append('span')
      .attr(
        'style',
        `display:inline-block;width:min(240px,45vw);height:0.75em;border-radius:2px;` +
          `background:linear-gradient(to right, ${paleta.escala.join(', ')})`
      );
    legenda.append('span').attr('style', estiloTexto).text(`${pesoMaximo} posts em comum`);

    tornarFixavel(
      root,
      [
        { selecao: retangulos, chaveDe: (c: Celula) => `celula:${c.a}__${c.b}` },
        { selecao: rotulosY, chaveDe: (tg: string) => `tag:${tg}` },
        { selecao: rotulosX, chaveDe: (tg: string) => `tag:${tg}` },
      ],
      realcar,
      limpar
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      // Onda diagonal: o atraso cresce com a distância até o canto superior
      // esquerdo, então a matriz se preenche a partir da diagonal principal —
      // que é onde estão os blocos que o gráfico quer que sejam vistos.
      const atraso = (c: Celula) => (indice.get(c.a)! + indice.get(c.b)!) * 14;
      const opacidadeFinal = (c: Celula) => (ocultaPorMetade(c) ? 0 : 1);

      // `aplicar()` acabou de chamar `aplicarRealce()`, que roda uma transição
      // NOMEADA ("realce") sobre `opacity`. Nomes distintos não se cancelam —
      // é o que a lição de 2026-08-18 explora de propósito pra animar geometria
      // e realce ao mesmo tempo — mas aqui as duas disputam o MESMO atributo, e
      // a de realce (sem atraso) escreveria opacity=1 por cima da onda de
      // entrada, fazendo a matriz inteira acender de uma vez. Interromper só
      // essa transição, e só neste elemento, resolve sem afetar o resto.
      retangulos.interrupt('realce');

      // Só opacidade: um `scale` num <rect> dependeria de `transform-origin`,
      // que como ATRIBUTO de apresentação não é suportado de forma confiável em
      // SVG — sem ele o retângulo encolheria na direção da origem do viewBox,
      // vindo de fora da tela em vez de crescer no lugar.
      retangulos.attr('opacity', 0);
      retangulos
        .transition()
        .delay(atraso)
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('opacity', opacidadeFinal);

      const maiorAtraso = (tags.length - 1) * 2 * 14;
      garantirEstadoFinal(maiorAtraso + DURATION.base + 250, () => {
        retangulos.interrupt().attr('opacity', opacidadeFinal);
      });
    }
  },
};

export default chart;
