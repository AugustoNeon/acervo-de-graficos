/**
 * Bolhas animadas (estilo Gapminder) — primeira versão interativa deste
 * gráfico (o exemplo original só produz um GIF, via gganimate).
 *
 * Em vez de gerar um GIF (precisaria de gganimate + gifski + transformr,
 * dependências pesadas nunca usadas neste acervo, pra um caminho de
 * animação fixo, sem pausa nem tooltip), a versão interativa reaproveita só
 * o dado bruto do data.json e anima a transição entre anos em D3 — com
 * play/pause, régua pra arrastar até qualquer ano, e tooltip por planeta.
 */

import { select, scaleLog, scaleLinear, scaleSqrt, axisBottom, axisLeft } from 'd3';
import { DURATION, EASE_STATE, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface SerieAno {
  ano: number;
  tecnologia: number;
  expectativa: number;
  populacao: number;
}

interface Planeta {
  nome: string;
  setor: string;
  /** Uma entrada por ano, na mesma ordem de meta.anos. */
  serie: SerieAno[];
}

interface Dados {
  meta: {
    setores: string[];
    paleta: Record<string, string>;
    anos: number[];
    dominioTecnologia: [number, number];
    dominioExpectativa: [number, number];
    dominioPopulacao: [number, number];
    nota?: string;
  };
  planetas: Planeta[];
}

const VB_W = 900;
const VB_H = 620;
const MARGEM = { topo: 24, dir: 24, baixo: 50, esq: 56 };
const RAIO = { min: 5, max: 34 };
const INTERVALO_PLAY_MS = 900;
const OPACIDADE_APAGADA = 0.12;

/** Alvo de realce: um setor, ou nada (estado neutro). */
type Foco = string | null;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Gráfico de bolhas animado: 12 planetas fictícios de 4 setores galácticos, mostrando índice ' +
    'tecnológico, expectativa de vida dos colonos e população ao longo de 20 anos.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, planetas } = data as Dados;
    const { anos, paleta } = meta;

    // Qualquer timer de reproducao de um desenho ANTERIOR deste mesmo host
    // precisa parar antes de montar um novo -- sem isso, um redesenho por
    // resize enquanto o play esta ligado deixaria dois timers avancando o
    // ano ao mesmo tempo.
    const hostComTimer = root as unknown as { _bolhasTimer?: ReturnType<typeof setInterval> };
    if (hostComTimer._bolhasTimer) {
      clearInterval(hostComTimer._bolhasTimer);
      hostComTimer._bolhasTimer = undefined;
    }

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const x = scaleLog().domain(meta.dominioTecnologia).range([0, larguraUtil]).nice();
    const folgaY = (meta.dominioExpectativa[1] - meta.dominioExpectativa[0]) * 0.08;
    const y = scaleLinear()
      .domain([meta.dominioExpectativa[0] - folgaY, meta.dominioExpectativa[1] + folgaY])
      .range([alturaUtil, 0]);
    const r = scaleSqrt().domain([0, meta.dominioPopulacao[1]]).range([px(RAIO.min), px(RAIO.max)]);

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gGradeY = g.append('g');
    const gEixoX = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const gEixoY = g.append('g');
    const gBolhas = g.append('g');

    estilarGrade(gGradeY.call(axisLeft(y).ticks(6).tickSize(-larguraUtil).tickFormat(() => '')), theme);
    estilarEixo(gEixoX.call(axisBottom(x).ticks(5, '~s').tickSizeOuter(0)), theme, px);
    estilarEixo(gEixoY.call(axisLeft(y).ticks(6).tickSizeOuter(0)), theme, px);

    svg
      .append('text')
      .attr('x', MARGEM.esq + larguraUtil / 2)
      .attr('y', VB_H - px(8))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(14))
      .text('Índice tecnológico (escala log)');

    svg
      .append('text')
      .attr('x', px(16))
      .attr('y', MARGEM.topo + alturaUtil / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(14))
      .attr('transform', `rotate(-90, ${px(16)}, ${MARGEM.topo + alturaUtil / 2})`)
      .text('Expectativa de vida dos colonos');

    // Ano corrente em destaque, no canto — a régua já mostra o número, mas
    // aqui ele fica visível mesmo com a página rolada até o gráfico.
    const rotuloAno = svg
      .append('text')
      .attr('x', MARGEM.esq + larguraUtil)
      .attr('y', MARGEM.topo + px(4))
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'hanging')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(28))
      .attr('opacity', 0.5);

    // ----------------------------------------------------------------- bolhas
    let indiceAno = 0;

    const bolhas = gBolhas
      .selectAll<SVGCircleElement, Planeta>('circle')
      .data(planetas, (d) => d.nome)
      .join('circle')
      .attr('fill', (d) => paleta[d.setor])
      .attr('fill-opacity', 0.75)
      .attr('stroke', (d) => paleta[d.setor])
      .attr('stroke-width', px(1.5))
      .attr('data-interactive', '');

    function posicionar(indice: number, transicionar: boolean) {
      const sel = transicionar ? bolhas.transition().duration(DURATION.slow).ease(EASE_STATE) : bolhas;
      sel
        .attr('cx', (d) => x(d.serie[indice].tecnologia))
        .attr('cy', (d) => y(d.serie[indice].expectativa))
        .attr('r', (d) => r(d.serie[indice].populacao));
      rotuloAno.text(`Ano ${anos[indice]}`);
    }

    // --------------------------------------------------------------- realce
    const realcar = (foco: Foco) => {
      bolhas
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) => (!foco || d.setor === foco ? 0.75 : OPACIDADE_APAGADA))
        .attr('stroke-opacity', (d) => (!foco || d.setor === foco ? 1 : OPACIDADE_APAGADA));
    };

    const conteudoTooltip = (d: Planeta) => {
      const s = d.serie[indiceAno];
      return (
        `<strong>${d.nome}</strong> · ${d.setor}<br>` +
        `Tecnologia ${s.tecnologia} · Vida ${s.expectativa} anos<br>` +
        `População ${s.populacao} mi`
      );
    };

    bolhas
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => tooltip.hide());

    // --------------------------------------------------------------- legenda
    const legendaBotoes = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(meta.setores)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((setor) => `<span class="viz-swatch" style="background:${paleta[setor]}"></span>${setor}`)
      .on('focus', (_e, setor) => realcar(setor))
      .on('blur', () => realcar(null));

    // Clicar numa bolha ou na legenda fixa o setor (as duas apontam pra
    // mesma chave, entao clicar em qualquer uma fixa igual). Foco de teclado
    // (focus/blur acima) continua so hover, sem participar do fixar.
    tornarFixavel(
      root,
      [
        { selecao: bolhas, chaveDe: (d: Planeta) => d.setor },
        { selecao: legendaBotoes, chaveDe: (s: string) => s },
      ],
      (chave) => realcar(chave),
      () => realcar(null)
    );

    // -------------------------------------------------------- play + régua
    const controles = select(root).append('div').attr('class', 'viz-slider');

    const botaoPlay = controles
      .append('button')
      .attr('type', 'button')
      .attr('class', 'viz-slider-play')
      .attr('data-interactive', '')
      .attr('aria-pressed', 'false')
      .text('▶ Reproduzir');

    const saida = controles.append('output').text(`Ano ${anos[0]}`);

    const inputAno = controles
      .append('input')
      .attr('type', 'range')
      .attr('min', 0)
      .attr('max', anos.length - 1)
      .attr('step', 1)
      .attr('value', 0)
      .attr('data-interactive', '')
      .attr('aria-label', 'Ano');

    function pararPlay() {
      if (hostComTimer._bolhasTimer) {
        clearInterval(hostComTimer._bolhasTimer);
        hostComTimer._bolhasTimer = undefined;
      }
      botaoPlay.attr('aria-pressed', 'false').text('▶ Reproduzir');
    }

    function irParaAno(indice: number, transicionar: boolean) {
      indiceAno = indice;
      posicionar(indice, transicionar);
      saida.text(`Ano ${anos[indice]}`);
      (inputAno.node() as HTMLInputElement).value = String(indice);
    }

    inputAno.on('input', function () {
      pararPlay();
      irParaAno(Number((this as HTMLInputElement).value), true);
    });

    botaoPlay.on('click', () => {
      if (hostComTimer._bolhasTimer) {
        pararPlay();
        return;
      }
      botaoPlay.attr('aria-pressed', 'true').text('⏸ Pausar');
      hostComTimer._bolhasTimer = setInterval(() => {
        irParaAno((indiceAno + 1) % anos.length, true);
      }, INTERVALO_PLAY_MS);
    });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    if (animate) {
      posicionar(0, false);
      bolhas
        .attr('r', 0)
        .transition()
        .delay((_d, i) => stagger(i, planetas.length, 400))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', (d) => r(d.serie[0].populacao));

      garantirEstadoFinal(DURATION.enter * 1.6, () => {
        bolhas.interrupt().attr('r', (d) => r(d.serie[indiceAno].populacao));
      });
    } else {
      posicionar(0, false);
    }
  },
};

export default chart;
