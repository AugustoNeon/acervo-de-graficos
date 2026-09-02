/**
 * Linha do tempo: marcos de uma startup fictícia.
 *
 * O lado (acima/abaixo do eixo) de cada marco vem pronto do `data.json` --
 * calculado uma vez no R, nunca recalculado aqui -- pra estático e
 * interativo nunca discordarem de qual marco fica de que lado (mesma regra
 * de "a cor nasce uma vez" da matriz de adjacência, aplicada a layout em vez
 * de cor). Entrada escalonada da esquerda pra direita: as hastes crescem a
 * partir do eixo em ordem cronológica, o próprio gesto da história se
 * revelando no tempo, não só decoração.
 *
 * Cor por CATEGORIA do marco (Fundação/Produto/Financeiro/Crescimento),
 * nunca por posição no tempo -- o eixo/espinha continua neutro (cinza), só o
 * evento em si carrega cor. Legenda clicável (mesmo `tornarFixavel` do
 * cronograma de lançamento) acende os marcos da categoria apontada/clicada.
 */

import { select, scaleUtc, axisBottom, utcYear } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, formatarDataUtc } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Evento {
  data: string;
  marco: string;
  categoria: string;
  lado: 1 | -1;
}

interface Dados {
  meta: { corEixo: string; cores: Record<string, string> };
  eventos: Evento[];
}

const VB_W = 900;
const VB_H = 420;
const MARGEM = { topo: 70, dir: 30, baixo: 40, esq: 30 };
const HASTE = 90; // altura da haste da 1a camada, em px reais
const PASSO_CAMADA = 46; // px reais a mais por camada de colisao

/**
 * O PNG estático (1500px) nunca colide; a versão interativa mora numa
 * coluna bem mais estreita (~750px neste site), então dois marcos com
 * meses de distância podem ter texto largo o bastante pra se sobrepor
 * mesmo alternando só 2 lados (ex: "Rodada seed" e "Rodada série A", 15
 * meses de distância). Em vez de confiar que a matemática "dá certo" num
 * container específico, calcula quantas camadas de altura cada marco
 * precisa: dentro do mesmo lado (acima/abaixo, decidido no R -- nunca
 * mudado aqui), o próximo marco só sobe de camada quando de fato colidiria
 * em X com o marco mais recente já colocado NAQUELA camada.
 */
function calcularCamadas<T extends { xPx: number; larguraLabelPx: number; lado: 1 | -1 }>(pontos: T[]): number[] {
  const porLado = new Map<1 | -1, T[]>();
  pontos.forEach((p) => porLado.set(p.lado, [...(porLado.get(p.lado) ?? []), p]));

  const camadaDe = new Map<T, number>();
  for (const grupo of porLado.values()) {
    grupo.sort((a, b) => a.xPx - b.xPx);
    const bordaDireitaPorCamada: number[] = [];
    for (const ponto of grupo) {
      const esquerda = ponto.xPx - ponto.larguraLabelPx / 2;
      const direita = ponto.xPx + ponto.larguraLabelPx / 2;
      let camada = 0;
      while ((bordaDireitaPorCamada[camada] ?? -Infinity) > esquerda) camada++;
      bordaDireitaPorCamada[camada] = direita;
      camadaDe.set(ponto, camada);
    }
  }
  return pontos.map((p) => camadaDe.get(p) ?? 0);
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label: 'Linha do tempo com os marcos de uma startup fictícia entre 2019 e 2024, cada um com data e descrição.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, eventos } = data as Dados;
    const pontos = eventos.map((e) => ({ ...e, dataObj: new Date(e.data) }));

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;
    const pxParaReal = (v: number) => v / escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;

    const datas = pontos.map((p) => +p.dataObj);
    const folga = (Math.max(...datas) - Math.min(...datas)) * 0.08;
    const x = scaleUtc()
      .domain([new Date(Math.min(...datas) - folga), new Date(Math.max(...datas) + folga)])
      .range([0, larguraUtil]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');

    // Mede a largura de verdade de cada rótulo (getComputedTextLength entende
    // kerning e a fonte real, contar caractere erraria pra qualquer marco fora
    // do comum) num grupo invisível, só pra decidir a camada de cada haste --
    // depois some, nunca chega a aparecer.
    const chaveDe = (e: (typeof pontos)[number]) => e.data;
    const gMedicao = svg.append('g').attr('opacity', 0).attr('aria-hidden', 'true');
    const medidas = gMedicao
      .selectAll<SVGTextElement, (typeof pontos)[number]>('text')
      .data(pontos, chaveDe)
      .join('text')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .text((d) => d.marco);
    const pontosComCamada = pontos.map((p, i) => ({
      ...p,
      xPx: pxParaReal(x(p.dataObj)),
      larguraLabelPx: pxParaReal(medidas.nodes()[i].getComputedTextLength()),
    }));
    const camadas = calcularCamadas(pontosComCamada);
    gMedicao.remove();

    const alturaRealDe = new Map(pontosComCamada.map((p, i) => [chaveDe(p), HASTE + camadas[i] * PASSO_CAMADA]));
    const alturaReal = (d: (typeof pontos)[number]) => alturaRealDe.get(chaveDe(d)) ?? HASTE;

    const alturasAcima = pontos.filter((d) => d.lado === -1).map((d) => alturaReal(d));
    const alturasAbaixo = pontos.filter((d) => d.lado === 1).map((d) => alturaReal(d));
    const maxAcima = Math.max(HASTE, ...alturasAcima);
    const maxAbaixo = Math.max(HASTE, ...alturasAbaixo);

    const centroY = MARGEM.topo + px(maxAcima * 1.18);
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${centroY})`);

    const gEixo = g.append('g').attr('transform', `translate(0,${px(maxAbaixo * 1.18 + 12)})`);
    const eixo = axisBottom(x).ticks(utcYear.every(1)).tickSizeOuter(0).tickFormat(((d: Date) => formatarDataUtc(d, { year: 'numeric' })) as never);
    gEixo.call(eixo as never);
    estilarEixo(gEixo, theme, px);

    g.append('line')
      .attr('x1', 0)
      .attr('x2', larguraUtil)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', meta.corEixo)
      .attr('stroke-width', px(2.4));

    const hastes = g
      .selectAll<SVGLineElement, (typeof pontos)[number]>('line.haste')
      .data(pontos, chaveDe)
      .join('line')
      .attr('class', 'haste')
      .attr('x1', (d) => x(d.dataObj))
      .attr('x2', (d) => x(d.dataObj))
      .attr('stroke', (d) => meta.cores[d.categoria])
      .attr('stroke-width', px(1.4));

    const rotulos = g
      .selectAll<SVGTextElement, (typeof pontos)[number]>('text.marco')
      .data(pontos, chaveDe)
      .join('text')
      .attr('class', 'marco')
      .attr('x', (d) => x(d.dataObj))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .text((d) => d.marco);

    const rotulosData = g
      .selectAll<SVGTextElement, (typeof pontos)[number]>('text.data-marco')
      .data(pontos, chaveDe)
      .join('text')
      .attr('class', 'data-marco')
      .attr('x', (d) => x(d.dataObj))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(10))
      .text((d) => formatarDataUtc(d.dataObj, { month: 'short', year: 'numeric' }));

    hastes.attr('y2', (d) => d.lado * px(alturaReal(d)));
    rotulos
      .attr('y', (d) => d.lado * px(alturaReal(d) * 1.18))
      .attr('dominant-baseline', (d) => (d.lado > 0 ? 'text-after-edge' : 'text-before-edge'));
    rotulosData
      .attr('y', (d) => d.lado * px(alturaReal(d) * 0.35))
      .attr('dominant-baseline', (d) => (d.lado > 0 ? 'text-after-edge' : 'text-before-edge'));

    const circulos = g
      .selectAll<SVGCircleElement, (typeof pontos)[number]>('circle')
      .data(pontos, chaveDe)
      .join('circle')
      .attr('cx', (d) => x(d.dataObj))
      .attr('cy', 0)
      .attr('r', px(5))
      .attr('fill', (d) => meta.cores[d.categoria])
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.5))
      .attr('data-interactive', '');

    circulos
      .on('pointermove', (evento: PointerEvent, d: (typeof pontos)[number]) => {
        tooltip.show(
          `<span class="viz-swatch" style="background:${meta.cores[d.categoria]}"></span>` +
            `<strong>${d.marco}</strong><br>${d.categoria} · ${formatarDataUtc(d.dataObj, { day: 'numeric', month: 'long', year: 'numeric' })}`,
          evento
        );
      })
      .on('pointerleave', () => tooltip.hide());

    // -------------------------------------------------------------- realce
    // Apontar/clicar um marco OU a legenda acende todos os marcos da mesma
    // categoria e apaga o resto — mesmo padrão do cronograma de lançamento
    // (fixável, clique fora desfixa).
    function realcar(categoria: string) {
      hastes.attr('opacity', (d) => (d.categoria === categoria ? 1 : 0.2));
      circulos.attr('opacity', (d) => (d.categoria === categoria ? 1 : 0.2));
      rotulos.attr('opacity', (d) => (d.categoria === categoria ? 1 : 0.35));
      rotulosData.attr('opacity', (d) => (d.categoria === categoria ? 1 : 0.35));
      legenda.attr('opacity', (c) => (c === categoria ? 1 : 0.5));
    }
    function limpar() {
      hastes.attr('opacity', 1);
      circulos.attr('opacity', 1);
      rotulos.attr('opacity', 1);
      rotulosData.attr('opacity', 1);
      legenda.attr('opacity', 1);
    }

    const categorias = Object.keys(meta.cores);
    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(categorias)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((c) => `<span class="viz-swatch" style="background:${meta.cores[c]}"></span>${c}`);

    tornarFixavel(
      root,
      [
        { selecao: circulos, chaveDe: (d: (typeof pontos)[number]) => d.categoria },
        { selecao: legenda, chaveDe: (c: string) => c },
      ],
      realcar,
      limpar
    );

    if (animate) {
      // As hastes nascem fechadas no eixo (altura 0) e crescem pra fora em
      // ordem cronológica -- a própria história se desenrolando no tempo.
      hastes.attr('y2', 0);
      rotulos.attr('opacity', 0);
      rotulosData.attr('opacity', 0);
      circulos.attr('r', 0);

      const delay = (_d: (typeof pontos)[number], i: number) => stagger(i, pontos.length);

      hastes
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('y2', (d) => d.lado * px(alturaReal(d)));

      rotulos.transition().delay((d, i) => delay(d, i) + DURATION.enter * 0.6).duration(DURATION.base).attr('opacity', 1);
      rotulosData.transition().delay((d, i) => delay(d, i) + DURATION.enter * 0.6).duration(DURATION.base).attr('opacity', 1);
      circulos
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', px(5));

      garantirEstadoFinal(DURATION.enter + DURATION.base + 250, () => {
        hastes.interrupt().attr('y2', (d) => d.lado * px(alturaReal(d)));
        rotulos.interrupt().attr('opacity', 1);
        rotulosData.interrupt().attr('opacity', 1);
        circulos.interrupt().attr('r', px(5));
      });
    }
  },
};

export default chart;
