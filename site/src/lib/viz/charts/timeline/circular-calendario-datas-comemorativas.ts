/**
 * Linha do tempo CIRCULAR: calendário de datas comemorativas do Brasil.
 *
 * O R exporta só dia-do-ano/categoria brutos (nunca ângulo ou posição de
 * rótulo já prontos) -- o D3 recalcula a MESMA trigonometria e o MESMO
 * algoritmo de espalhamento de rótulos colidentes do script.R, mesmo
 * princípio já usado no gráfico ternário desta categoria (fórmula
 * compartilhada, nunca geometria pronta compartilhada).
 *
 * O rótulo colidente é espalhado no eixo ANGULAR (outro dia do ano pro
 * TEXTO, nunca pro ponto), não no raio: o texto sai rotacionado alinhado
 * com o próprio raio (tipo raio de roda) em qualquer ponto do círculo, e
 * "abrir espaço pelo raio" competiria direto com o comprimento do próprio
 * nome (ver AGENTS.md "Lições aprendidas" -- essa foi a primeira tentativa,
 * e não funcionou). O ponto (a data real) nunca se move; só o texto, ligado
 * por uma linha-guia fina.
 */

import { select } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Evento {
  evento: string;
  data: string;
  diaDoAno: number;
  categoria: string;
}

interface Dados {
  meta: { cores: Record<string, string> };
  eventos: Evento[];
}

const VB = 1000;
const RAD = Math.PI / 180;

/** Ângulo (graus, 0 no topo/1o de janeiro, sentido horário) de um dia do ano. */
function angulo(diaDoAno: number): number {
  return (diaDoAno / 365) * 360;
}

/** Coordenada polar -> cartesiana, relativa ao centro. */
function ponto(diaDoAno: number, raio: number): [number, number] {
  const t = angulo(diaDoAno) * RAD;
  return [raio * Math.sin(t), -raio * Math.cos(t)];
}

/**
 * Espalha os rótulos que colidem pra outros dias, mantendo a data real de
 * cada ponto intacta -- mesmo algoritmo do `script.R` (comentado lá em
 * detalhe): ordena, corta o círculo no maior vão vazio (evita depender
 * circularmente do último elemento pro primeiro), estica numa reta contínua
 * (+365 depois do corte) pra cascata poder empurrar sem se confundir com a
 * virada do calendário, e só então volta pra faixa 1-365.
 *
 * `diasNecessarios(i)` decide QUANTOS dias de distância o rótulo no índice
 * `i` (já na ordem cortada/contínua) precisa do anterior -- calculado fora
 * daqui a partir do comprimento REAL do nome anterior medido em tela (efeito
 * parecido com o `espacarRotulos()` do slope chart desta base: cascata
 * usando a medida real, não um número fixo de dias que funciona pra um nome
 * curto e não pra um comprido).
 */
function calcularDiaTexto(eventos: Evento[], diasNecessarios: (idxOriginal: number) => number): number[] {
  const n = eventos.length;
  const idxOrdenado = eventos.map((_, i) => i).sort((a, b) => eventos[a].diaDoAno - eventos[b].diaDoAno);
  const diaOrd = idxOrdenado.map((i) => eventos[i].diaDoAno);

  const gaps = [diaOrd[0] + 365 - diaOrd[n - 1], ...diaOrd.slice(1).map((d, i) => d - diaOrd[i])];
  let corte = 0;
  let maiorGap = -Infinity;
  gaps.forEach((g, i) => {
    if (g > maiorGap) {
      maiorGap = g;
      corte = i;
    }
  });

  const idxRot = Array.from({ length: n }, (_, i) => idxOrdenado[(i + corte) % n]);
  const diaRot = idxRot.map((i) => eventos[i].diaDoAno);

  const diaContinuo = diaRot.slice();
  for (let i = 1; i < n; i++) {
    if (diaContinuo[i] < diaContinuo[i - 1]) {
      for (let j = i; j < n; j++) diaContinuo[j] += 365;
      break;
    }
  }

  const diaTextoRot: number[] = new Array(n);
  diaTextoRot[0] = diaContinuo[0];
  for (let i = 1; i < n; i++) {
    const minSep = diasNecessarios(idxRot[i - 1]);
    diaTextoRot[i] = diaContinuo[i] - diaTextoRot[i - 1] < minSep ? diaTextoRot[i - 1] + minSep : diaContinuo[i];
  }

  const diaTexto = new Array<number>(n);
  idxRot.forEach((origIdx, i) => {
    diaTexto[origIdx] = ((diaTextoRot[i] - 1) % 365) + 1;
  });
  return diaTexto;
}

const ABREV_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIA_DO_MES = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]; // 1o de cada mes, ano nao-bissexto

const chart: VizChart = {
  aspectRatio: 1,
  label:
    'Calendário circular com 18 datas comemorativas do Brasil ao longo do ano, coloridas por categoria ' +
    '(nacional, religiosa, comercial, cultural, internacional).',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, eventos } = data as Dados;

    const escala = VB / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB} ${VB}`).attr('aria-hidden', 'true');
    const raiz = svg.append('g').attr('transform', `translate(${VB / 2},${VB / 2})`);

    // O raio disponível (metade do viewBox menos uma margem de borda) é
    // FIXO -- o círculo sempre usa o espaço todo que tem, em vez de
    // encolher pra abrir espaço pro texto (encolher o círculo faz os
    // PONTOS colidirem de novo, só troca um problema por outro, pior
    // ainda em telas estreitas onde já tem pouco espaço de sobra). Quem
    // cede é o TAMANHO DA FONTE: mede o rótulo mais longo e, se ele não
    // couber no espaço que sobra além do anel mais externo (raioTextoLonge),
    // encolhe a fonte e mede de novo -- poucas iterações, sempre convergindo,
    // porque largura de texto cresce ~linear com o tamanho da fonte. Sem
    // isso, numa tela estreita a fonte em px reais (constante) devora o
    // raio disponível (que só cresce em px reais, não em unidades de
    // viewBox) e o rótulo mais comprido vaza da viewBox: ver AGENTS.md
    // "Lições aprendidas".
    const R = VB / 2 - px(24);
    const FRACAO_TEXTO_LONGE = 0.36;
    const raioTextoLongePx = R * FRACAO_TEXTO_LONGE;
    // +20px de folga (não 10): o rótulo mais comprido daqui tem quase 40
    // caracteres, e o mesmo erro relativo de medição (fonte de fallback
    // ainda carregando no instante da medição, ver AGENTS.md "Lições
    // aprendidas") vira um erro absoluto bem maior num nome desse tamanho.
    const folgaDisponivel = R - raioTextoLongePx - px(20);

    const gMedicao = raiz.append('g').attr('opacity', 0).attr('aria-hidden', 'true');
    function medirTodos(fontSizePx: number): number[] {
      const nos = gMedicao
        .selectAll<SVGTextElement, Evento>('text')
        .data(eventos)
        .join('text')
        .attr('font-family', theme.fontBody)
        .attr('font-weight', 700)
        .attr('font-size', fontSizePx)
        .text((d) => d.evento)
        .nodes();
      return nos.map((n) => n.getComputedTextLength());
    }

    const FONTE_MAX = 12;
    const FONTE_MIN = 6.5;
    let FONTE_ROTULO = FONTE_MAX;
    let larguras = medirTodos(px(FONTE_ROTULO));
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const maior = Math.max(...larguras);
      if (maior <= folgaDisponivel || FONTE_ROTULO <= FONTE_MIN) break;
      // Largura de texto escala ~linearmente com o tamanho da fonte --
      // reduz na mesma proporção do excesso medido, converge em 1-2 passos.
      FONTE_ROTULO = Math.max(FONTE_MIN, FONTE_ROTULO * (folgaDisponivel / maior));
      larguras = medirTodos(px(FONTE_ROTULO));
    }
    gMedicao.remove();

    const raioPonto = R * 0.3;
    const raioTextoPerto = R * 0.32;
    const raioTextoLonge = raioTextoLongePx;
    const raioMesSpoke = R * 0.5;
    const raioMesLabel = R * 0.53;
    const raioTexto = (empurrado: boolean) => (empurrado ? raioTextoLonge : raioTextoPerto);

    // Separação mínima fixa em dias entre um rótulo e o próximo. Uma versão
    // anterior tentou CONVERTER o comprimento medido do nome anterior direto
    // pra graus via arco = raio × ângulo -- e não funciona aqui: essa fórmula
    // só vale pra ângulos pequenos (arco ≈ reta), e o texto deste gráfico é
    // tão comprido em relação ao raio que o "ângulo" dava mais de 90°,
    // espalhando rótulos por metade do círculo à toa. O comprimento do nome
    // não se traduz em distância ANGULAR de forma simples porque o texto
    // sai orientado radialmente (não tangencialmente) -- ver "Notas do
    // coletor" no README. Um valor fixo, calibrado olhando o resultado,
    // resolve sem essa complicação.
    const MIN_SEPARACAO_DIAS = 13;
    const diaTexto = calcularDiaTexto(eventos, () => MIN_SEPARACAO_DIAS);
    const pontos = eventos.map((e, i) => {
      const diaTxt = diaTexto[i];
      const empurrado = Math.abs(diaTxt - e.diaDoAno) > 0.01;
      const bruto = 90 - (diaTxt / 365) * 360;
      const anguloNorm = ((bruto + 180) % 360) - 180;
      const vira = Math.abs(anguloNorm) > 90;
      return {
        ...e,
        diaTexto: diaTxt,
        empurrado,
        anguloTexto: vira ? anguloNorm + 180 : anguloNorm,
        ancora: (vira ? 'end' : 'start') as 'start' | 'end',
      };
    });

    // ------------------------------------------------------------- meses
    const meses = ABREV_MES.map((mes, i) => ({ mes, diaDoAno: DIA_DO_MES[i] }));
    raiz
      .selectAll('line.mes')
      .data(meses)
      .join('line')
      .attr('class', 'mes')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (d) => ponto(d.diaDoAno, raioMesSpoke)[0])
      .attr('y2', (d) => ponto(d.diaDoAno, raioMesSpoke)[1])
      .attr('stroke', theme.border)
      .attr('stroke-width', px(0.8));

    raiz
      .selectAll('text.mes')
      .data(meses)
      .join('text')
      .attr('class', 'mes')
      .attr('x', (d) => ponto(d.diaDoAno, raioMesLabel)[0])
      .attr('y', (d) => ponto(d.diaDoAno, raioMesLabel)[1])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      // Encolhe na mesma proporção do rótulo de evento: em telas estreitas
      // a fonte cheia (11px reais) empurraria até a abreviação de 3 letras
      // pra fora do raio disponível.
      .attr('font-size', px(11 * (FONTE_ROTULO / FONTE_MAX)))
      .attr('fill', theme.inkMuted)
      .text((d) => d.mes);

    // ------------------------------------------------------------ guias
    const guias = raiz
      .selectAll<SVGLineElement, (typeof pontos)[number]>('line.guia')
      .data(pontos.filter((p) => p.empurrado), (d: any) => d.evento)
      .join('line')
      .attr('class', 'guia')
      .attr('x1', (d) => ponto(d.diaDoAno, raioPonto)[0])
      .attr('y1', (d) => ponto(d.diaDoAno, raioPonto)[1])
      .attr('x2', (d) => ponto(d.diaTexto, raioTexto(d.empurrado) - px(6))[0])
      .attr('y2', (d) => ponto(d.diaTexto, raioTexto(d.empurrado) - px(6))[1])
      .attr('stroke', (d) => meta.cores[d.categoria])
      .attr('stroke-width', px(1))
      .attr('opacity', 0.5);

    // ------------------------------------------------------------ pontos
    const chaveDe = (d: Evento) => d.evento;
    const circulos = raiz
      .selectAll<SVGCircleElement, (typeof pontos)[number]>('circle')
      .data(pontos, chaveDe)
      .join('circle')
      .attr('cx', (d) => ponto(d.diaDoAno, raioPonto)[0])
      .attr('cy', (d) => ponto(d.diaDoAno, raioPonto)[1])
      .attr('r', px(5))
      .attr('fill', (d) => meta.cores[d.categoria])
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.2))
      .attr('data-interactive', '');

    // ------------------------------------------------------------ rotulos
    const rotulos = raiz
      .selectAll<SVGTextElement, (typeof pontos)[number]>('text.evento')
      .data(pontos, chaveDe)
      .join('text')
      .attr('class', 'evento')
      .attr('transform', (d) => {
        const [x, y] = ponto(d.diaTexto, raioTexto(d.empurrado));
        return `translate(${x},${y}) rotate(${d.anguloTexto})`;
      })
      .attr('text-anchor', (d) => d.ancora)
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(FONTE_ROTULO))
      .attr('fill', (d) => meta.cores[d.categoria])
      .text((d) => d.evento);

    function mostrarTooltip(evento: PointerEvent, d: (typeof pontos)[number]) {
      const dataFormatada = new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
      });
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.categoria]}"></span>` +
          `<strong>${d.evento}</strong><br>${dataFormatada} · ${d.categoria}`,
        evento
      );
    }
    circulos.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());
    rotulos.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    // -------------------------------------------------------------- realce
    function realcar(categoria: string) {
      circulos.attr('opacity', (d) => (d.categoria === categoria ? 1 : 0.2));
      rotulos.attr('opacity', (d) => (d.categoria === categoria ? 1 : 0.25));
      guias.attr('opacity', (d) => (d.categoria === categoria ? 0.5 : 0.08));
      legenda.attr('opacity', (c) => (c === categoria ? 1 : 0.5));
    }
    function limpar() {
      circulos.attr('opacity', 1);
      rotulos.attr('opacity', 1);
      guias.attr('opacity', 0.5);
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
        { selecao: rotulos, chaveDe: (d: (typeof pontos)[number]) => d.categoria },
        { selecao: legenda, chaveDe: (c: string) => c },
      ],
      realcar,
      limpar
    );

    // -------------------------------------------------------------- entrada
    if (animate) {
      circulos.attr('r', 0);
      rotulos.attr('opacity', 0);
      guias.attr('opacity', 0);

      const delayDe = (d: (typeof pontos)[number]) => {
        const i = pontos.findIndex((p) => p.evento === d.evento);
        return stagger(i, pontos.length);
      };

      circulos.transition().delay(delayDe).duration(DURATION.enter).ease(EASE_ENTER).attr('r', px(5));
      rotulos.transition().delay((d) => delayDe(d) + DURATION.enter * 0.5).duration(DURATION.base).attr('opacity', 1);
      guias.transition().delay((d) => delayDe(d) + DURATION.enter * 0.5).duration(DURATION.base).attr('opacity', 0.5);

      garantirEstadoFinal(DURATION.enter + DURATION.base + 250, () => {
        circulos.interrupt().attr('r', px(5));
        rotulos.interrupt().attr('opacity', 1);
        guias.interrupt().attr('opacity', 0.5);
      });
    }
  },
};

export default chart;
