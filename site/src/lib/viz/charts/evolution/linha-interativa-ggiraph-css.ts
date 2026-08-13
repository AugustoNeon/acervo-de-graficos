/**
 * Índice de sentimento econômico — série temporal interativa.
 *
 * Reproduz o output.png (mesmas 6 séries, mesma paleta) e acrescenta o que a
 * imagem não dá: passar o cursor numa linha a destaca e apaga as demais, com
 * um ponto que acompanha a posição mais próxima do cursor e mostra o valor
 * exato naquele mês.
 */

import { select, scaleUtc, scaleLinear, line, axisBottom, axisLeft, bisector, pointer, type Selection } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  pais: string;
  data: string;
  indice: number;
}

interface Dados {
  meta: { paleta: Record<string, string>; nota?: string };
  series: Ponto[];
}

interface PontoLido {
  pais: string;
  data: Date;
  indice: number;
}

const VB_W = 900;
const VB_H = 600;
const MARGEM = { topo: 30, direita: 20, baixo: 40, esq: 46 };
const OPACIDADE_LINHA = 0.85;
const OPACIDADE_APAGADA = 0.12;

const chart: VizChart = {
  aspectRatio: 1.5,
  label:
    'Série temporal: índice de sentimento econômico de 6 países da América do Sul ao longo de ' +
    '24 meses.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, series } = data as Dados;

    const pontos: PontoLido[] = series.map((d) => ({ ...d, data: new Date(d.data) }));
    const porPais = new Map<string, PontoLido[]>();
    pontos.forEach((d) => {
      if (!porPais.has(d.pais)) porPais.set(d.pais, []);
      porPais.get(d.pais)!.push(d);
    });
    const paises = [...porPais.keys()];

    // scaleUtc (nao scaleTime): as datas vem do data.json como "AAAA-MM-DD",
    // que o JS parseia como meia-noite UTC -- usar uma escala UTC evita todo
    // um genero de bug de fuso horario (eixo/ticks/format calculando no fuso
    // local do navegador, ver AGENTS.md "Licoes aprendidas" 2026-07-21).
    const x = scaleUtc()
      .domain([Math.min(...pontos.map((d) => +d.data)), Math.max(...pontos.map((d) => +d.data))])
      .range([MARGEM.esq, VB_W - MARGEM.direita]);
    const y = scaleLinear()
      .domain([Math.min(...pontos.map((d) => d.indice)), Math.max(...pontos.map((d) => d.indice))])
      .nice()
      .range([VB_H - MARGEM.baixo, MARGEM.topo]);

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    // ---------------------------------------------------------------- grade
    // O output.png usa theme_minimal(), que desenha grade horizontal E
    // vertical (panel.grid.major) -- sem isso a versao D3 fica mais "pelada"
    // que a miniatura estatica. Truque classico do d3-axis pra virar grade:
    // tickSize igual a extensao do eixo oposto, sem texto nem linha de eixo.
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;
    const larguraUtil = VB_W - MARGEM.esq - MARGEM.direita;

    const gradeY = axisLeft(y).ticks(5).tickSize(-larguraUtil).tickFormat(() => '');
    const gradeX = axisBottom(x).ticks(6).tickSize(-alturaUtil).tickFormat(() => '');

    const estilarGrade = (sel: Selection<SVGGElement, unknown, null, undefined>) => {
      sel.select('.domain').remove();
      sel.selectAll('.tick line').attr('stroke', theme.border).attr('stroke-opacity', 0.6);
    };

    estilarGrade(svg.append('g').attr('transform', `translate(${MARGEM.esq},0)`).call(gradeY));
    estilarGrade(
      svg.append('g').attr('transform', `translate(0,${VB_H - MARGEM.baixo})`).call(gradeX)
    );

    // ---------------------------------------------------------------- eixos
    // tickFormat customizado: o default do d3-axis so tem nomes de mes em
    // ingles (sem locale pt-BR embutido) -- timeZone:'UTC' pelo mesmo motivo
    // do tooltip (as datas sao meia-noite UTC).
    const formatarTick = (d: Date) =>
      d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    const eixoX = axisBottom(x).ticks(6).tickSizeOuter(0).tickFormat(formatarTick);
    const eixoY = axisLeft(y).ticks(5).tickSizeOuter(0);

    const estilarEixo = (sel: Selection<SVGGElement, unknown, null, undefined>) => {
      sel.select('.domain').attr('stroke', theme.border);
      sel.selectAll('.tick line').attr('stroke', theme.border);
      sel
        .selectAll('text')
        .attr('fill', theme.inkMuted)
        .attr('font-family', theme.fontMono)
        .attr('font-size', px(11));
    };

    estilarEixo(svg.append('g').attr('transform', `translate(0,${VB_H - MARGEM.baixo})`).call(eixoX));
    estilarEixo(svg.append('g').attr('transform', `translate(${MARGEM.esq},0)`).call(eixoY));

    // ---------------------------------------------------------------- linhas
    const gerarLinha = line<PontoLido>()
      .x((d) => x(d.data))
      .y((d) => y(d.indice));

    const camadaLinhas = svg.append('g').attr('fill', 'none');
    const linhas = camadaLinhas
      .selectAll<SVGPathElement, [string, PontoLido[]]>('path.linha')
      .data([...porPais.entries()])
      .join('path')
      .attr('class', 'linha')
      .attr('d', ([, pts]) => gerarLinha(pts))
      .attr('stroke', ([pais]) => meta.paleta[pais] ?? theme.accent)
      .attr('stroke-width', px(2.4))
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('opacity', OPACIDADE_LINHA);

    // Faixa invisivel mais larga por cima de cada linha, so pra facilitar o
    // hover -- um traco de 2.4px e um alvo de ponteiro pequeno demais.
    const alvosHover = camadaLinhas
      .selectAll<SVGPathElement, [string, PontoLido[]]>('path.alvo')
      .data([...porPais.entries()])
      .join('path')
      .attr('class', 'alvo')
      .attr('d', ([, pts]) => gerarLinha(pts))
      .attr('stroke', 'transparent')
      .attr('stroke-width', px(14))
      .attr('data-interactive', '');

    const camadaPontos = svg.append('g');
    const pontosSel = camadaPontos
      .selectAll<SVGCircleElement, PontoLido>('circle')
      .data(pontos)
      .join('circle')
      .attr('cx', (d) => x(d.data))
      .attr('cy', (d) => y(d.indice))
      .attr('r', px(2.2))
      .attr('fill', (d) => meta.paleta[d.pais] ?? theme.accent)
      .attr('opacity', OPACIDADE_LINHA);

    // Ponto de destaque que acompanha a posicao mais proxima do cursor.
    const pontoAtivo = svg
      .append('circle')
      .attr('r', px(5))
      .attr('fill', theme.bg)
      .attr('stroke-width', px(2.5))
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    // -------------------------------------------------------------- interacao
    const realcar = (pais: string | null) => {
      linhas
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', ([p]) => (pais === null || p === pais ? OPACIDADE_LINHA : OPACIDADE_APAGADA))
        .attr('stroke-width', ([p]) => px(pais === p ? 3.2 : 2.4));

      pontosSel
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => (pais === null || d.pais === pais ? OPACIDADE_LINHA : OPACIDADE_APAGADA));
    };

    const buscarMaisProximo = bisector<PontoLido, Date>((d) => d.data).left;

    alvosHover
      .on('pointerenter', (_evento: PointerEvent, [pais]) => realcar(pais))
      .on('pointermove', (evento: PointerEvent, [pais, pts]) => {
        const [mx] = pointer(evento, svg.node());
        const dataAlvo = x.invert(mx);
        const i = buscarMaisProximo(pts, dataAlvo, 1);
        const antes = pts[i - 1];
        const depois = pts[i];
        const maisProximo =
          !depois || (antes && +dataAlvo - +antes.data < +depois.data - +dataAlvo) ? antes : depois;
        if (!maisProximo) return;

        pontoAtivo
          .attr('cx', x(maisProximo.data))
          .attr('cy', y(maisProximo.indice))
          .attr('stroke', meta.paleta[pais] ?? theme.accent)
          .attr('opacity', 1);

        // timeZone: 'UTC' e obrigatorio aqui -- as datas vem do data.json como
        // string "AAAA-MM-DD", que o JS parseia como meia-noite UTC; formatar
        // no fuso local (ex: America/Sao_Paulo, UTC-3) cruza pra o dia
        // anterior e mostra o mes errado (ver AGENTS.md "Licoes aprendidas"
        // 2026-07-21, mesmo defeito ja catalogado em site/src/lib/format.ts).
        const mesAno = maisProximo.data.toLocaleDateString('pt-BR', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        });
        tooltip.show(`<strong>${pais}</strong><br>${mesAno}<br>Índice: ${maisProximo.indice.toFixed(1)}`, evento);
      })
      .on('pointerleave', () => {
        realcar(null);
        pontoAtivo.attr('opacity', 0);
        tooltip.hide();
      });

    // --------------------------------------------------------------- legenda
    select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(paises)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((pais) => `<span class="viz-swatch" style="background:${meta.paleta[pais]}"></span>${pais}`)
      .on('pointerenter', (_e, pais) => realcar(pais))
      .on('pointerleave', () => realcar(null))
      .on('focus', (_e, pais) => realcar(pais))
      .on('blur', () => realcar(null));

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Cada linha desenha da esquerda pra direita (dasharray/offset), uma
    // depois da outra -- acompanha a leitura natural de uma serie temporal.
    if (animate) {
      const comprimentos = new Map<string, number>();
      linhas.each(function ([pais]) {
        comprimentos.set(pais, this.getTotalLength());
      });

      linhas
        .attr('stroke-dasharray', ([pais]) => comprimentos.get(pais)!)
        .attr('stroke-dashoffset', ([pais]) => comprimentos.get(pais)!)
        .transition()
        .delay((_d, i) => i * 90)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('stroke-dashoffset', 0);

      pontosSel
        .attr('opacity', 0)
        .transition()
        .delay(DURATION.enter * 0.6)
        .duration(DURATION.base)
        .attr('opacity', OPACIDADE_LINHA);

      garantirEstadoFinal(paises.length * 90 + DURATION.enter + 250, () => {
        linhas.interrupt().attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
        pontosSel.interrupt().attr('opacity', OPACIDADE_LINHA);
      });
    }
  },
};

export default chart;
