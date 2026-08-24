/**
 * Nuvem de palavras: avaliações de um app fictício — versão em D3.
 *
 * O `wordcloud()` do R calcula o próprio layout (posição em espiral, com
 * detecção de colisão) internamente e só desenha, sem devolver as
 * coordenadas — então, em vez de tentar exportar/reaproveitar esse layout,
 * o D3 calcula o SEU PRÓPRIO layout do zero com `d3-cloud` (mesma família
 * de algoritmo: espiral + colisão), mesmo princípio já usado pra layout de
 * rede neste acervo (estocástico/caro demais pra exportar do R — cada motor
 * calcula a própria disposição válida, não existe uma coordenada "certa"
 * única a ser compartilhada).
 *
 * Diferença do estático: aqui a cor é por SENTIMENTO (positivo/negativo/
 * neutro), não por frequência — dá pra clicar num sentimento na legenda e
 * isolar só aquele grupo de palavras entre as 46.
 */

import { select } from 'd3';
import cloud from 'd3-cloud';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Palavra {
  palavra: string;
  frequencia: number;
  sentimento: 'positivo' | 'negativo' | 'neutro';
}

interface Dados {
  meta: {
    dominioFrequencia: [number, number];
    paletaSentimento: Record<string, string>;
    nota?: string;
  };
  palavras: Palavra[];
}

interface PalavraPosicionada extends Palavra {
  x: number;
  y: number;
  rotate: number;
  size: number;
}

const VB_W = 800;
const VB_H = 520;
const TAMANHO_MIN = 14;
const TAMANHO_MAX = 88;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Nuvem de palavras: 46 termos fictícios de avaliações de um app bancário, ' +
    'tamanho pela frequência e cor pelo sentimento (positivo, negativo ou neutro).',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, palavras } = data as Dados;
    const { paletaSentimento } = meta;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const [freqMin, freqMax] = meta.dominioFrequencia;
    const tamanhoDe = (f: number) => {
      const t = freqMax === freqMin ? 1 : (f - freqMin) / (freqMax - freqMin);
      return TAMANHO_MIN + t * (TAMANHO_MAX - TAMANHO_MIN);
    };

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${VB_W / 2},${VB_H / 2})`);

    const layout = cloud()
      .size([VB_W, VB_H])
      .words(palavras.map((p) => ({ ...p, text: p.palavra, size: tamanhoDe(p.frequencia) })))
      .padding(3)
      .rotate(() => (Math.random() < 0.78 ? 0 : 90))
      .font(theme.fontBody)
      .fontSize((d) => (d as unknown as { size: number }).size)
      .on('end', desenhar);

    layout.start();

    function desenhar(palavrasPosicionadas: unknown[]) {
      const dadosPos = palavrasPosicionadas as PalavraPosicionada[];

      const textosSel = g
        .selectAll<SVGTextElement, PalavraPosicionada>('text')
        .data(dadosPos, (d) => d.palavra)
        .join('text')
        .attr('data-interactive', '')
        .attr('text-anchor', 'middle')
        .attr('font-family', theme.fontBody)
        .attr('font-weight', 700)
        .attr('fill', (d) => paletaSentimento[d.sentimento] ?? theme.accent)
        .attr('font-size', (d) => px(d.size))
        .attr('transform', (d) => `translate(${px(d.x)},${px(d.y)}) rotate(${d.rotate})`)
        .text((d) => d.palavra);

      function conteudoTooltip(d: PalavraPosicionada): string {
        return `<strong>${d.palavra}</strong><br>${d.frequencia} menções · ${d.sentimento}`;
      }

      textosSel
        .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
        .on('pointerleave', () => tooltip.hide());

      tornarFixavel(
        root,
        { selecao: textosSel, chaveDe: (d) => d.palavra },
        (palavra) =>
          textosSel
            .transition('realce')
            .duration(DURATION.fast)
            .attr('opacity', (d) => (d.palavra === palavra ? 1 : 0.18)),
        () => textosSel.transition('realce').duration(DURATION.fast).attr('opacity', 1)
      );

      // -------------------------------------------------------- legenda
      let sentimentoFixado: string | null = null;
      const legenda = select(root).append('div').attr('class', 'viz-legenda');
      const botoesLegenda = legenda
        .selectAll<HTMLButtonElement, string>('button')
        .data(['positivo', 'negativo', 'neutro'])
        .join('button')
        .attr('type', 'button')
        .attr('data-interactive', '')
        .attr('aria-pressed', 'false')
        .html((s) => `<span class="viz-swatch" style="background:${paletaSentimento[s]}"></span>${s}`)
        .on('click', (_evento, s) => {
          sentimentoFixado = sentimentoFixado === s ? null : s;
          botoesLegenda.attr('aria-pressed', (m) => String(m === sentimentoFixado));
          textosSel
            .transition('sentimento')
            .duration(DURATION.fast)
            .attr('opacity', (d) => (sentimentoFixado === null || d.sentimento === sentimentoFixado ? 1 : 0.1));
        });

      if (meta.nota) {
        select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
      }

      // ------------------------------------------------------------ entrada
      if (animate) {
        textosSel
          .attr('opacity', 0)
          .transition()
          .delay((_d, i) => stagger(i, dadosPos.length, 700))
          .duration(DURATION.enter)
          .ease(EASE_ENTER)
          .attr('opacity', 1);

        garantirEstadoFinal(DURATION.enter + stagger(dadosPos.length - 1, dadosPos.length, 700) + 100, () => {
          textosSel.interrupt().attr('opacity', 1);
        });
      }
    }
  },
};

export default chart;
