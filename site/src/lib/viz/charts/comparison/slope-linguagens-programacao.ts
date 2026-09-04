/**
 * Slope chart: uso de linguagens de programação, 2020 x 2024.
 *
 * Cada linguagem vira uma única linha ligando dois instantes no tempo — a
 * INCLINAÇÃO da linha já é o dado (sobe, desce, ou cruza outra linha), sem
 * precisar calcular a diferença de cabeça. Sem legenda separada: o rótulo
 * ao lado de cada ponta já cumpre esse papel (convenção clássica do slope
 * chart). Cor por linguagem nasce uma única vez no R (`meta.cores`).
 */

import { select, scaleLinear } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Linguagem {
  linguagem: string;
  ano2020: number;
  ano2024: number;
}

interface Dados {
  meta: { cores: Record<string, string> };
  linguagens: Linguagem[];
}

const VB_W = 900;
// Mais alto que largo de propósito (proporção incomum pra um gráfico deste
// acervo): com 10 categorias empilhadas verticalmente nas duas pontas, a
// altura real disponível pro espaçamento mínimo dos rótulos precisa
// acompanhar a largura, e uma proporção mais quadrada deixaria pouca
// margem de manobra em containers estreitos mesmo com o resto dos
// cuidados abaixo.
const VB_H = 780;
const RAIO = 4.5;
const DIST_MIN_ROTULO = 17; // px reais -- espaço mínimo vertical ideal entre dois rótulos da mesma coluna
const FONTE_ROTULO = 12; // px reais
const GAP_ROTULO = 12; // px reais -- respiro entre a ponta da linha e o começo do rótulo

/**
 * Empurra rótulos que colidiriam na vertical pra baixo, mantendo a ordem
 * por valor -- mesmo princípio de "camada por colisão" já usado na linha
 * do tempo de marcos, aqui numa única dimensão (só empurra pra baixo,
 * nunca pros lados, já que a coluna é vertical).
 *
 * Um único empurrão se propaga: uma vez que um item precisa subir, todo
 * item seguinte herda aquele deslocamento como novo piso, mesmo que o
 * PRÓPRIO vizinho dele nunca fosse colidir -- por isso o vão entre o
 * primeiro e o último rótulo pode crescer bem além da soma "ingênua" de
 * `minDist × (n-1)`, e não dá pra prever de antemão um espaçamento fixo
 * que garanta caber (uma tentativa anterior tentou isso e ainda estourava
 * a área disponível). A correção de verdade só é possível DEPOIS de ver
 * o vão final: se ele não coube em `alturaDisponivel`, todo o bloco é
 * comprimido proporcionalmente (mantém a ordem e a posição relativa,
 * encolhe as distâncias) até caber, e só então reancorado dentro dos
 * limites -- nunca vaza da viewBox em telas estreitas, mesmo no pior caso
 * de vários valores próximos em sequência.
 */
function espacarRotulos<T>(itens: T[], yDe: (d: T) => number, minDist: number, alturaDisponivel: number): Map<T, number> {
  const ordenados = [...itens].sort((a, b) => yDe(a) - yDe(b));
  const yAjustado = new Map<T, number>();
  let ultimoY = -Infinity;
  for (const item of ordenados) {
    const y = Math.max(yDe(item), ultimoY + minDist);
    yAjustado.set(item, y);
    ultimoY = y;
  }

  const valores = [...yAjustado.values()];
  const minY = Math.min(...valores);
  const maxY = Math.max(...valores);
  const vao = maxY - minY;
  if (vao > alturaDisponivel && vao > 0) {
    const fator = alturaDisponivel / vao;
    for (const chave of yAjustado.keys()) {
      const y = yAjustado.get(chave)!;
      yAjustado.set(chave, minY + (y - minY) * fator);
    }
  }

  // Reancora o bloco (comprimido ou não) dentro de [0, alturaDisponivel],
  // priorizando nunca estourar por CIMA sobre nunca estourar por baixo.
  const valoresFinais = [...yAjustado.values()];
  const minFinal = Math.min(...valoresFinais);
  const maxFinal = Math.max(...valoresFinais);
  let deslocamento = maxFinal > alturaDisponivel ? alturaDisponivel - maxFinal : 0;
  if (minFinal + deslocamento < 0) deslocamento = -minFinal;
  if (deslocamento !== 0) {
    for (const chave of yAjustado.keys()) yAjustado.set(chave, yAjustado.get(chave)! + deslocamento);
  }
  return yAjustado;
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Slope chart comparando o uso de 10 linguagens de programação entre 2020 e 2024, cada uma como ' +
    'uma linha ligando os dois anos — a inclinação mostra quem subiu, desceu ou cruzou outra linguagem.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, linguagens } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svgMedicao = select(root).append('svg').attr('opacity', 0).attr('aria-hidden', 'true');
    const rotuloEsqTexto = (d: Linguagem) => `${d.linguagem} (${d.ano2020}%)`;
    const rotuloDirTexto = (d: Linguagem) => `${d.linguagem} (${d.ano2024}%)`;
    const medir = (textos: string[]): number => {
      const g = svgMedicao.append('g');
      const nos = g
        .selectAll('text')
        .data(textos)
        .join('text')
        .attr('font-family', theme.fontBody)
        .attr('font-weight', 700)
        .attr('font-size', px(FONTE_ROTULO))
        .text((d) => d)
        .nodes();
      const maiorVB = Math.max(...nos.map((n) => (n as SVGTextElement).getComputedTextLength()));
      g.remove();
      return maiorVB;
    };
    // Margem calculada a partir da largura REAL do maior rótulo (medida em
    // px reais via px(), igual ao tamanho de fonte usado de fato) -- nunca
    // um número fixo de unidades de viewBox, que encolheria relativamente
    // ao texto num container estreito e vazaria da tela (mesma classe de
    // bug já registrada duas vezes em AGENTS.md "Lições aprendidas").
    const larguraRotuloEsq = medir(linguagens.map(rotuloEsqTexto));
    const larguraRotuloDir = medir(linguagens.map(rotuloDirTexto));
    svgMedicao.remove();

    // +2px de folga além da largura medida: sem ela, a margem bate exatamente
    // na borda da viewBox (zero de sobra), e qualquer diferença sub-pixel
    // entre a medição e o render final (kerning, arredondamento de fonte)
    // já é o bastante pra vazar por uma fração de pixel.
    const FOLGA_SEGURANCA = px(2);
    const MARGEM = {
      topo: px(40),
      baixo: px(36),
      esq: larguraRotuloEsq + px(RAIO + GAP_ROTULO) + FOLGA_SEGURANCA,
      dir: larguraRotuloDir + px(RAIO + GAP_ROTULO) + FOLGA_SEGURANCA,
    };

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const valores = linguagens.flatMap((l) => [l.ano2020, l.ano2024]);
    const folga = (Math.max(...valores) - Math.min(...valores)) * 0.06;
    const y = scaleLinear()
      .domain([Math.min(...valores) - folga, Math.max(...valores) + folga])
      .range([alturaUtil, 0]);
    const xEsq = 0;
    const xDir = larguraUtil;

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    // Duas linhas verticais guia + os rótulos "2020"/"2024" no topo.
    [xEsq, xDir].forEach((x) => {
      g.append('line')
        .attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', alturaUtil)
        .attr('stroke', theme.border)
        .attr('stroke-width', px(1));
    });
    g.selectAll('text.ano')
      .data([{ x: xEsq, texto: '2020' }, { x: xDir, texto: '2024' }])
      .join('text')
      .attr('class', 'ano')
      .attr('x', (d) => d.x)
      .attr('y', alturaUtil + px(24))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(13))
      .attr('fill', theme.ink)
      .text((d) => d.texto);

    const chaveDe = (d: Linguagem) => d.linguagem;

    const linhas = g
      .selectAll<SVGLineElement, Linguagem>('line.slope')
      .data(linguagens, chaveDe)
      .join('line')
      .attr('class', 'slope')
      .attr('x1', xEsq).attr('x2', xDir)
      .attr('y1', (d) => y(d.ano2020))
      .attr('y2', (d) => y(d.ano2024))
      .attr('stroke', (d) => meta.cores[d.linguagem])
      .attr('stroke-width', px(2.2))
      .attr('data-interactive', '');

    const pontosEsq = g
      .selectAll<SVGCircleElement, Linguagem>('circle.esq')
      .data(linguagens, chaveDe)
      .join('circle')
      .attr('class', 'esq')
      .attr('cx', xEsq)
      .attr('cy', (d) => y(d.ano2020))
      .attr('r', px(RAIO))
      .attr('fill', (d) => meta.cores[d.linguagem]);

    const pontosDir = g
      .selectAll<SVGCircleElement, Linguagem>('circle.dir')
      .data(linguagens, chaveDe)
      .join('circle')
      .attr('class', 'dir')
      .attr('cx', xDir)
      .attr('cy', (d) => y(d.ano2024))
      .attr('r', px(RAIO))
      .attr('fill', (d) => meta.cores[d.linguagem]);

    // Rótulos: um por ponta, "Linguagem (valor%)" -- crescem PRA FORA (esquerda
    // cresce pra esquerda, direita pra direita), nunca pra dentro do gráfico,
    // então nunca sobrepõem as linhas. A posição Y é reespaçada só o
    // suficiente pra não colidir com o rótulo vizinho da mesma coluna.
    // Reserva uma faixa antes do fim de `alturaUtil` pra nenhum rótulo
    // empurrado chegar perto o bastante dos rótulos "2020"/"2024" do eixo
    // (que moram logo abaixo, em `alturaUtil + px(24)`) -- sem essa
    // reserva, um rótulo de valor baixo o bastante pra ser empurrado até o
    // limite da área útil colide verticalmente com o ano.
    const alturaDisponivelRotulos = alturaUtil - px(22);
    const yEsqAjustado = espacarRotulos(linguagens, (d) => y(d.ano2020), px(DIST_MIN_ROTULO), alturaDisponivelRotulos);
    const yDirAjustado = espacarRotulos(linguagens, (d) => y(d.ano2024), px(DIST_MIN_ROTULO), alturaDisponivelRotulos);

    const rotulosEsq = g
      .selectAll<SVGTextElement, Linguagem>('text.rotulo-esq')
      .data(linguagens, chaveDe)
      .join('text')
      .attr('class', 'rotulo-esq')
      .attr('x', xEsq - px(RAIO + GAP_ROTULO))
      .attr('y', (d) => yEsqAjustado.get(d) ?? y(d.ano2020))
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(FONTE_ROTULO))
      .attr('fill', (d) => meta.cores[d.linguagem])
      .attr('data-interactive', '')
      .text(rotuloEsqTexto);

    const rotulosDir = g
      .selectAll<SVGTextElement, Linguagem>('text.rotulo-dir')
      .data(linguagens, chaveDe)
      .join('text')
      .attr('class', 'rotulo-dir')
      .attr('x', xDir + px(RAIO + GAP_ROTULO))
      .attr('y', (d) => yDirAjustado.get(d) ?? y(d.ano2024))
      .attr('dy', '0.32em')
      .attr('text-anchor', 'start')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(FONTE_ROTULO))
      .attr('fill', (d) => meta.cores[d.linguagem])
      .attr('data-interactive', '')
      .text(rotuloDirTexto);

    function mostrarTooltip(evento: PointerEvent, d: Linguagem) {
      const delta = d.ano2024 - d.ano2020;
      const seta = delta > 0 ? '▲' : delta < 0 ? '▼' : '＝';
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.linguagem]}"></span>` +
          `<strong>${d.linguagem}</strong><br>${d.ano2020}% → ${d.ano2024}% ` +
          `<span style="opacity:.8">(${seta} ${Math.abs(delta)} p.p.)</span>`,
        evento
      );
    }
    [linhas, pontosEsq, pontosDir, rotulosEsq, rotulosDir].forEach((sel) =>
      (sel as typeof linhas).on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide())
    );

    // -------------------------------------------------------------- realce
    function realcar(linguagem: string) {
      linhas.attr('opacity', (d) => (d.linguagem === linguagem ? 1 : 0.12));
      pontosEsq.attr('opacity', (d) => (d.linguagem === linguagem ? 1 : 0.12));
      pontosDir.attr('opacity', (d) => (d.linguagem === linguagem ? 1 : 0.12));
      rotulosEsq.attr('opacity', (d) => (d.linguagem === linguagem ? 1 : 0.25));
      rotulosDir.attr('opacity', (d) => (d.linguagem === linguagem ? 1 : 0.25));
    }
    function limpar() {
      linhas.attr('opacity', 1);
      pontosEsq.attr('opacity', 1);
      pontosDir.attr('opacity', 1);
      rotulosEsq.attr('opacity', 1);
      rotulosDir.attr('opacity', 1);
    }

    tornarFixavel(
      root,
      [
        { selecao: linhas, chaveDe },
        { selecao: rotulosEsq, chaveDe },
        { selecao: rotulosDir, chaveDe },
      ],
      realcar,
      limpar
    );

    // -------------------------------------------------------------- entrada
    // As linhas "escrevem" da esquerda pra direita (dash-offset), em ordem
    // decrescente de valor em 2020 -- lê como um ranking se revelando.
    if (animate) {
      const porValor2020Desc = [...linguagens].sort((a, b) => b.ano2020 - a.ano2020);
      const ordemDe = new Map(porValor2020Desc.map((d, i) => [d.linguagem, i]));
      const delay = (d: Linguagem) => stagger(ordemDe.get(d.linguagem) ?? 0, linguagens.length);

      pontosEsq.attr('r', 0);
      pontosDir.attr('r', 0);
      rotulosEsq.attr('opacity', 0);
      rotulosDir.attr('opacity', 0);

      linhas.each(function () {
        const comprimento = (this as SVGLineElement).getTotalLength();
        select(this).attr('stroke-dasharray', comprimento).attr('stroke-dashoffset', comprimento);
      });
      linhas
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('stroke-dashoffset', 0);

      pontosEsq.transition().delay(delay).duration(DURATION.base).attr('r', px(RAIO));
      pontosDir
        .transition()
        .delay((d) => delay(d) + DURATION.enter * 0.85)
        .duration(DURATION.base)
        .attr('r', px(RAIO));
      rotulosEsq.transition().delay(delay).duration(DURATION.base).attr('opacity', 1);
      rotulosDir
        .transition()
        .delay((d) => delay(d) + DURATION.enter * 0.85)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        linhas.interrupt().attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
        pontosEsq.interrupt().attr('r', px(RAIO));
        pontosDir.interrupt().attr('r', px(RAIO));
        rotulosEsq.interrupt().attr('opacity', 1);
        rotulosDir.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
