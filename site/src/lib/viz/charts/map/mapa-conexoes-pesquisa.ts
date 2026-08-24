/**
 * Mapa de conexões — versão interativa.
 *
 * O R já calcula o caminho de grande círculo de cada rota (`geosphere::gcIntermediate`,
 * 50 pontos por trecho, quebrado em dois trechos quando cruza o antimeridiano)
 * e exporta os pontos prontos — o D3 só projeta cada ponto lon/lat com a
 * mesma projeção do mapa de fundo e conecta com uma linha, sem recalcular
 * geometria de rota nenhuma (mesmo princípio de "recalcular só o que é
 * barato" já usado neste acervo, aplicado ao contrário: aqui a geometria é
 * cara — trigonometria esférica —, então ela nasce pronta do R).
 *
 * O contorno do mundo usa a mesma correção de enrolamento de anel do
 * dashboard de inovação, agora extraída pra `shared/mapa.ts`.
 */

import { select, geoNaturalEarth1, geoPath, scaleLinear, scaleSqrt, line as d3line } from 'd3';
import { DURATION, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { corrigirEnrolamento, type GeoFeatureCollection } from '../../shared/mapa';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Cidade {
  nome: string;
  regiao: string;
  lon: number;
  lat: number;
  total: number;
}

interface RotaSegmento {
  rota_id: number;
  segmento: number;
  origem: string;
  destino: string;
  pesquisadores: number;
  regiao_origem: string;
  pontos: [number, number][];
}

interface Dados {
  meta: { paleta: Record<string, string>; dominioTotal: [number, number] };
  mapa: GeoFeatureCollection;
  cidades: Cidade[];
  rotas: RotaSegmento[];
}

const VB_W = 960;
const MAPA_H = 560;
const LEGENDA_H = 50;
const VB_H = MAPA_H + LEGENDA_H;
const OPACIDADE_APAGADA = 0.12;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Mapa-múndi com 10 centros de pesquisa e as rotas de intercâmbio entre eles, desenhadas como ' +
    'caminhos de grande círculo. Passar o cursor numa rota ou numa cidade realça as conexões dela.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, mapa, cidades, rotas } = data as Dados;
    corrigirEnrolamento(mapa);

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    const projecao = geoNaturalEarth1().fitSize([VB_W, MAPA_H - px(8)], mapa as never);
    const caminho = geoPath(projecao);
    const linha = d3line<[number, number]>()
      .x((d) => projecao(d)![0])
      .y((d) => projecao(d)![1]);

    const gMapa = svg.append('g').attr('transform', `translate(0,${px(4)})`);

    gMapa
      .selectAll('path')
      .data(mapa.features)
      .join('path')
      .attr('d', (d) => caminho(d as never))
      .attr('fill', theme.surface)
      .attr('stroke', theme.border)
      .attr('stroke-width', px(0.4));

    const larguraRota = scaleLinear()
      .domain([0, Math.max(...rotas.map((r) => r.pesquisadores))])
      .range([px(0.6), px(3.4)]);
    const opacidadeRota = scaleLinear()
      .domain([0, Math.max(...rotas.map((r) => r.pesquisadores))])
      .range([0.35, 0.9]);
    const raioCidade = scaleSqrt().domain(meta.dominioTotal).range([px(3), px(11)]);

    const rotasSel = gMapa
      .selectAll<SVGPathElement, RotaSegmento>('path.rota')
      .data(rotas)
      .join('path')
      .attr('class', 'rota')
      .attr('d', (d) => linha(d.pontos))
      .attr('fill', 'none')
      .attr('stroke', (d) => meta.paleta[d.regiao_origem] ?? theme.primary)
      .attr('stroke-width', (d) => larguraRota(d.pesquisadores))
      .attr('stroke-opacity', (d) => opacidadeRota(d.pesquisadores))
      .attr('stroke-linecap', 'round')
      .attr('data-interactive', '');

    const cidadesSel = gMapa
      .selectAll<SVGCircleElement, Cidade>('circle')
      .data(cidades)
      .join('circle')
      .attr('cx', (d) => projecao([d.lon, d.lat])![0])
      .attr('cy', (d) => projecao([d.lon, d.lat])![1])
      .attr('r', (d) => raioCidade(d.total))
      .attr('fill', theme.ink)
      .attr('fill-opacity', 0.85)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1))
      .attr('data-interactive', '');

    const rotulosSel = gMapa
      .selectAll<SVGTextElement, Cidade>('text')
      .data(cidades)
      .join('text')
      .attr('x', (d) => projecao([d.lon, d.lat])![0])
      .attr('y', (d) => projecao([d.lon, d.lat])![1] - raioCidade(d.total) - px(4))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(10.5))
      .attr('font-weight', 600)
      .attr('pointer-events', 'none')
      .text((d) => d.nome);

    // -------------------------------------------------------------- legenda
    const regioes = Object.keys(meta.paleta);
    const gLegenda = svg
      .append('g')
      .attr('transform', `translate(${VB_W / 2 - (regioes.length * 130) / 2},${MAPA_H + LEGENDA_H / 2})`);
    const itemLegenda = gLegenda
      .selectAll('g')
      .data(regioes)
      .join('g')
      .attr('transform', (_d, i) => `translate(${i * 130},0)`);
    itemLegenda
      .append('line')
      .attr('x1', 0)
      .attr('x2', px(20))
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', (d) => meta.paleta[d])
      .attr('stroke-width', px(3))
      .attr('stroke-linecap', 'round');
    itemLegenda
      .append('text')
      .attr('x', px(26))
      .attr('y', 0)
      .attr('dy', '0.32em')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(10.5))
      .text((d) => d);

    // -------------------------------------------------------------- hover
    const bateRota = (d: RotaSegmento, chave: { rotaId?: number; cidade?: string }) =>
      chave.rotaId !== undefined
        ? d.rota_id === chave.rotaId
        : d.origem === chave.cidade || d.destino === chave.cidade;

    function realcarRota(rotaId: number) {
      const alvo = rotas.find((r) => r.rota_id === rotaId)!;
      rotasSel
        .attr('stroke-opacity', (d) => (bateRota(d, { rotaId }) ? 1 : OPACIDADE_APAGADA))
        .attr('stroke-width', (d) => (bateRota(d, { rotaId }) ? larguraRota(d.pesquisadores) * 1.6 : larguraRota(d.pesquisadores)));
      const envolvidas = new Set([alvo.origem, alvo.destino]);
      cidadesSel.attr('fill-opacity', (d) => (envolvidas.has(d.nome) ? 1 : 0.35));
      rotulosSel
        .attr('font-weight', (d) => (envolvidas.has(d.nome) ? 700 : 600))
        .attr('fill', (d) => (envolvidas.has(d.nome) ? theme.ink : theme.inkMuted))
        .attr('opacity', (d) => (envolvidas.has(d.nome) ? 1 : 0.35));
    }

    function realcarCidade(nome: string) {
      rotasSel
        .attr('stroke-opacity', (d) => (bateRota(d, { cidade: nome }) ? 1 : OPACIDADE_APAGADA))
        .attr('stroke-width', (d) => (bateRota(d, { cidade: nome }) ? larguraRota(d.pesquisadores) * 1.6 : larguraRota(d.pesquisadores)));
      const envolvidas = new Set<string>([nome]);
      rotas.forEach((r) => {
        if (r.origem === nome) envolvidas.add(r.destino);
        if (r.destino === nome) envolvidas.add(r.origem);
      });
      cidadesSel.attr('fill-opacity', (d) => (envolvidas.has(d.nome) ? 1 : 0.35));
      rotulosSel
        .attr('font-weight', (d) => (envolvidas.has(d.nome) ? 700 : 600))
        .attr('fill', (d) => (envolvidas.has(d.nome) ? theme.ink : theme.inkMuted))
        .attr('opacity', (d) => (envolvidas.has(d.nome) ? 1 : 0.35));
    }

    function limpar() {
      rotasSel.attr('stroke-opacity', (d) => opacidadeRota(d.pesquisadores)).attr('stroke-width', (d) => larguraRota(d.pesquisadores));
      cidadesSel.attr('fill-opacity', 0.85);
      rotulosSel.attr('font-weight', 600).attr('fill', theme.inkMuted).attr('opacity', 1);
    }

    // Uma unica chave compartilhada entre rotas e cidades (prefixada por
    // tipo) pra que fixar por clique funcione entre as duas selecoes ao
    // mesmo tempo — clicar numa rota ou na cidade que ela liga fixa o mesmo
    // realce.
    const realcar = (chave: string) => {
      if (chave.startsWith('rota:')) realcarRota(Number(chave.slice(5)));
      else realcarCidade(chave.slice('cidade:'.length));
    };

    rotasSel
      .on('pointermove', (evento: PointerEvent, d) => {
        tooltip.show(
          `<strong>${d.origem}</strong> × <strong>${d.destino}</strong><br>${d.pesquisadores} pesquisadores/ano<br>origem: ${d.regiao_origem}`,
          evento
        );
      })
      .on('pointerleave', () => tooltip.hide());

    cidadesSel
      .on('pointermove', (evento: PointerEvent, d) => {
        tooltip.show(`<strong>${d.nome}</strong><br>${d.total} pesquisadores/ano (total nas rotas)`, evento);
      })
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(
      root,
      [
        { selecao: rotasSel, chaveDe: (d: RotaSegmento) => `rota:${d.rota_id}` },
        { selecao: cidadesSel, chaveDe: (d: Cidade) => `cidade:${d.nome}` },
      ],
      realcar,
      limpar
    );

    // -------------------------------------------------------------- entrada
    if (animate) {
      rotasSel
        .attr('stroke-opacity', 0)
        .transition()
        .delay((_d, i) => stagger(i, rotas.length, 500))
        .duration(DURATION.base)
        .ease(EASE_STATE)
        .attr('stroke-opacity', (d) => opacidadeRota(d.pesquisadores));
      cidadesSel
        .attr('fill-opacity', 0)
        .transition()
        .delay(400)
        .duration(DURATION.enter)
        .attr('fill-opacity', 0.85);

      garantirEstadoFinal(DURATION.enter + 500, () => {
        rotasSel.interrupt().attr('stroke-opacity', (d) => opacidadeRota(d.pesquisadores));
        cidadesSel.interrupt().attr('fill-opacity', 0.85);
      });
    }
  },
};

export default chart;
