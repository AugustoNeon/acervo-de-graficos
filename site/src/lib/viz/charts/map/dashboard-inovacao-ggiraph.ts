/**
 * Dashboard mapa + dispersão + barras — versão interativa.
 *
 * Os três painéis continuam separados (decisão fechada 2026-08-03, AGENTS.md:
 * vários painéis do mesmo dado não viram um só com seletor) — o que a
 * interatividade acrescenta é o REALCE LIGADO: passar o cursor em qualquer
 * painel destaca a mesma entidade nos outros dois. Os "5 estilos" da versão
 * ggiraph (que existiam porque a interatividade daquele pacote é só CSS) são
 * recriados aqui como 5 modos escolhidos por um seletor, cada um combinando
 * uma chave de agrupamento (país ou continente) com um tratamento visual —
 * mesmo padrão já usado em linha-interativa-ggiraph-css.ts.
 *
 * O R exporta só a geometria (já simplificada) e as duas variáveis por país
 * dentro do próprio GeoJSON — dispersão e ranking são derivados das MESMAS
 * `features`, sem duplicar dado em arrays à parte.
 */

import {
  select,
  geoNaturalEarth1,
  geoPath,
  scaleLinear,
  scaleBand,
  scaleSequential,
  interpolateYlGnBu,
  axisBottom,
  axisLeft,
  type Selection,
} from 'd3';
import { DURATION, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import type { DrawContext, VizChart } from '../../types';

interface Propriedades {
  nome: string;
  continente: string;
  investimento: number;
  inovacao: number;
}

interface Feature {
  type: 'Feature';
  properties: Propriedades;
  geometry: unknown;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

interface Dados {
  meta: { paleta: string; dominioInvestimento: [number, number]; continentes: string[]; nota?: string };
  mapa: FeatureCollection;
}

/** Área com sinal (fórmula do cadarço/shoelace) — positiva = sentido anti-horário. */
function areaComSinal(anel: number[][]): number {
  let area = 0;
  for (let i = 0; i < anel.length - 1; i++) {
    area += anel[i][0] * anel[i + 1][1] - anel[i + 1][0] * anel[i][1];
  }
  return area;
}

/**
 * O GeoJSON que o `sf`/GDAL escreve sai com o enrolamento dos anéis
 * INCONSISTENTE entre features — testado a mão comparando alguns países:
 * uns saem anti-horário, outros horário, sem um padrão óbvio (não é "todo
 * mundo invertido", uma correção cega piora metade e conserta a outra).
 * Sem o sentido que o `d3-geo` espera pro clipping esférico, o país desenha
 * como "o globo inteiro preenchido menos um buraco no formato dele" — um
 * blob cobrindo o mapa todo em vez do país sozinho. `d3.geoPath()` não
 * expõe opção pra isso, então a correção é por polígono: medir a área com
 * sinal de cada anel e forçar o anel externo pro sentido horário (o que o
 * d3-geo espera, testado empiricamente) e cada furo pro sentido oposto do
 * seu externo — a regra geral de anel externo vs. furo, não um sentido fixo
 * pros dois. Corrige por conta própria não importa o que veio de cada país.
 */
function corrigirEnrolamento(fc: FeatureCollection): void {
  fc.features.forEach((f) => {
    const geom = f.geometry as { coordinates?: unknown };
    const poligonos = geom.coordinates as number[][][][] | undefined;
    poligonos?.forEach((aneis) => {
      aneis.forEach((anel, i) => {
        const area = areaComSinal(anel);
        // anel externo (i===0): precisa de area negativa (horario).
        // furo (i>0): precisa do sinal OPOSTO ao do externo.
        const precisaNegativa = i === 0;
        if (precisaNegativa ? area > 0 : area < 0) anel.reverse();
      });
    });
  });
}

type Agrupamento = 'pais' | 'continente';

interface ConfigModo {
  id: number;
  rotulo: string;
  agrupamento: Agrupamento;
  fill: string;
  stroke?: string;
  filtro?: string;
  apagado?: { opacidade: number; filtro?: string };
}

const MODOS: ConfigModo[] = [
  { id: 1, rotulo: '1. Por país', agrupamento: 'pais', fill: '#e63946', stroke: '#1d3557' },
  { id: 2, rotulo: '2. Por continente', agrupamento: 'continente', fill: '#e63946', stroke: '#1d3557' },
  { id: 3, rotulo: '3. CSS customizado', agrupamento: 'pais', fill: '#f4a261', stroke: '#264653' },
  {
    id: 4,
    rotulo: '4. Glow avançado',
    agrupamento: 'pais',
    fill: '#ffd60a',
    filtro: 'drop-shadow(0 0 4px #ffd60a) drop-shadow(0 0 8px #ffd60a)',
  },
  {
    id: 5,
    rotulo: '5. Esmaecer não-selecionado',
    agrupamento: 'pais',
    fill: '#e63946',
    stroke: '#1d3557',
    apagado: { opacidade: 0.15, filtro: 'grayscale(70%)' },
  },
];

const COR_PONTO = '#1d3557';
const VB_W = 1100;
const MAPA_H = 440;
const GAP = 24;
const BAIXO_H = 360;
const VB_H = MAPA_H + GAP + BAIXO_H;
const LARGURA_PAINEL = (VB_W - GAP) / 2;
const TOP_N = 15;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Dashboard com mapa coroplético, dispersão e ranking de barras dos mesmos países, ' +
    'ligados por realce: passar o cursor em qualquer painel destaca a mesma entidade nos outros dois.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, mapa } = data as Dados;
    corrigirEnrolamento(mapa);
    const paises = mapa.features;
    const top15 = [...paises].sort((a, b) => b.properties.inovacao - a.properties.inovacao).slice(0, TOP_N);

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const cor = scaleSequential(interpolateYlGnBu).domain(meta.dominioInvestimento);

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    // ------------------------------------------------------------- mapa
    const projecao = geoNaturalEarth1().fitSize([VB_W, MAPA_H - px(4)], mapa as never);
    const caminho = geoPath(projecao);

    const gMapa = svg.append('g');
    const paisesSel = gMapa
      .selectAll<SVGPathElement, Feature>('path')
      .data(paises)
      .join('path')
      .attr('d', (d) => caminho(d as never))
      .attr('fill', (d) => cor(d.properties.investimento))
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(0.4))
      .attr('data-interactive', '');

    // --------------------------------------------------------- dispersão
    const gDispersao = svg.append('g').attr('transform', `translate(0,${MAPA_H + GAP})`);
    const margemD = { topo: 10, dir: 14, baixo: 36, esq: 42 };
    const larguraD = LARGURA_PAINEL - margemD.esq - margemD.dir;
    const alturaD = BAIXO_H - margemD.topo - margemD.baixo;

    const xInvest = scaleLinear()
      .domain([0, Math.max(...paises.map((d) => d.properties.investimento)) * 1.05])
      .nice()
      .range([0, larguraD]);
    const yInova = scaleLinear()
      .domain([0, Math.max(...paises.map((d) => d.properties.inovacao)) * 1.05])
      .nice()
      .range([alturaD, 0]);

    const gDispersaoInterno = gDispersao.append('g').attr('transform', `translate(${margemD.esq},${margemD.topo})`);
    const eixoXD = gDispersaoInterno.append('g').attr('transform', `translate(0,${alturaD})`);
    const eixoYD = gDispersaoInterno.append('g');
    estilarEixo(eixoXD.call(axisBottom(xInvest).ticks(5).tickSizeOuter(0)), theme, px);
    estilarEixo(eixoYD.call(axisLeft(yInova).ticks(5).tickSizeOuter(0)), theme, px);

    gDispersaoInterno
      .append('text')
      .attr('x', larguraD / 2)
      .attr('y', alturaD + px(30))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(11))
      .text('Investimento em P&D (US$ bi, fictício)');

    const pontosSel = gDispersaoInterno
      .selectAll<SVGCircleElement, Feature>('circle')
      .data(paises)
      .join('circle')
      .attr('cx', (d) => xInvest(d.properties.investimento))
      .attr('cy', (d) => yInova(d.properties.inovacao))
      .attr('r', px(2.6))
      .attr('fill', COR_PONTO)
      .attr('fill-opacity', 0.8)
      .attr('data-interactive', '');

    // ------------------------------------------------------------- barras
    const gBarras = svg.append('g').attr('transform', `translate(${LARGURA_PAINEL + GAP},${MAPA_H + GAP})`);
    const margemB = { topo: 10, dir: 20, baixo: 36, esq: 128 };
    const larguraB = LARGURA_PAINEL - margemB.esq - margemB.dir;
    const alturaB = BAIXO_H - margemB.topo - margemB.baixo;

    const xInova = scaleLinear()
      .domain([0, Math.max(...top15.map((d) => d.properties.inovacao)) * 1.05])
      .nice()
      .range([0, larguraB]);
    const yPais = scaleBand<string>()
      .domain(top15.map((d) => d.properties.nome))
      .range([0, alturaB])
      .padding(0.22);

    const gBarrasInterno = gBarras.append('g').attr('transform', `translate(${margemB.esq},${margemB.topo})`);
    const eixoXB = gBarrasInterno.append('g').attr('transform', `translate(0,${alturaB})`);
    const eixoYB = gBarrasInterno.append('g');
    estilarEixo(eixoXB.call(axisBottom(xInova).ticks(5).tickSizeOuter(0)), theme, px);
    estilarEixo(eixoYB.call(axisLeft(yPais).tickSizeOuter(0)), theme, px);
    eixoYB.selectAll('text').attr('font-size', px(10));

    gBarrasInterno
      .append('text')
      .attr('x', larguraB / 2)
      .attr('y', alturaB + px(30))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(11))
      .text('Índice de inovação (top 15, fictício)');

    const barrasSel = gBarrasInterno
      .selectAll<SVGRectElement, Feature>('rect')
      .data(top15)
      .join('rect')
      .attr('x', 0)
      .attr('y', (d) => yPais(d.properties.nome)!)
      .attr('width', (d) => xInova(d.properties.inovacao))
      .attr('height', yPais.bandwidth())
      .attr('fill', COR_PONTO)
      .attr('data-interactive', '');

    // -------------------------------------------------------- realce ligado
    let modoAtivo = MODOS[0];

    const chaveDe = (p: Propriedades) => (modoAtivo.agrupamento === 'continente' ? p.continente : p.nome);

    const aplicarNeutro = () => {
      paisesSel.interrupt().attr('fill', (d) => cor(d.properties.investimento)).attr('stroke', theme.bg).style('filter', null).attr('opacity', 1);
      pontosSel.interrupt().attr('fill', COR_PONTO).style('filter', null).attr('opacity', 1);
      barrasSel.interrupt().attr('fill', COR_PONTO).style('filter', null).attr('opacity', 1);
      tooltip.hide();
    };

    const realcar = (chave: string) => {
      const bate = (d: Feature) => chaveDe(d.properties) === chave;
      function aplicar<E extends Element>(
        sel: Selection<E, Feature, any, any>,
        corBase: (d: Feature) => string,
        strokeBase: (d: Feature) => string | null
      ): void {
        sel
          .attr('fill', (d) => (bate(d) ? modoAtivo.fill : corBase(d)))
          .attr('stroke', (d) => (bate(d) ? modoAtivo.stroke ?? strokeBase(d) : strokeBase(d)))
          .style('filter', (d) => (bate(d) ? modoAtivo.filtro ?? null : modoAtivo.apagado?.filtro ?? null))
          .attr('opacity', (d) => (bate(d) ? 1 : modoAtivo.apagado?.opacidade ?? 1));
      }
      aplicar(paisesSel, (d) => cor(d.properties.investimento), () => theme.bg);
      aplicar(pontosSel, () => COR_PONTO, () => null);
      aplicar(barrasSel, () => COR_PONTO, () => null);
    };

    const conteudoTooltip = (p: Propriedades) =>
      `<strong>${p.nome}</strong><br>P&D: US$ ${p.investimento} bi<br>Inovação: ${p.inovacao}`;

    [
      { sel: paisesSel },
      { sel: pontosSel },
      { sel: barrasSel },
    ].forEach(({ sel }) => {
      sel
        .on('pointerenter', (_e: PointerEvent, d: Feature) => realcar(chaveDe(d.properties)))
        .on('pointermove', (evento: PointerEvent, d: Feature) => tooltip.show(conteudoTooltip(d.properties), evento))
        .on('pointerleave', aplicarNeutro);
    });

    // -------------------------------------------------------------- seletor
    const controles = select(root).append('div').attr('class', 'viz-controles');
    const botoes = controles
      .selectAll('button')
      .data(MODOS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .attr('aria-pressed', (m) => String(m.id === modoAtivo.id))
      .text((m) => m.rotulo)
      .on('click', (_e, m) => {
        if (m.id === modoAtivo.id) return;
        modoAtivo = m;
        aplicarNeutro();
        botoes.attr('aria-pressed', (mm) => String(mm.id === modoAtivo.id));
      });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // -------------------------------------------------------------- entrada
    if (animate) {
      paisesSel
        .attr('opacity', 0)
        .transition()
        .delay((_d, i) => stagger(i, paises.length, 500))
        .duration(DURATION.base)
        .ease(EASE_STATE)
        .attr('opacity', 1);
      pontosSel
        .attr('opacity', 0)
        .transition()
        .delay((_d, i) => 500 + stagger(i, paises.length, 400))
        .duration(DURATION.base)
        .attr('opacity', 0.8);
      barrasSel
        .attr('opacity', 0)
        .transition()
        .delay((_d, i) => 500 + stagger(i, top15.length, 300))
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(1200, () => {
        paisesSel.interrupt().attr('opacity', 1);
        pontosSel.interrupt().attr('opacity', 0.8);
        barrasSel.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
