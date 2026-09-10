/**
 * Espiral: preço médio da gasolina, mês a mês (2021-2025).
 *
 * Técnica popularizada pela "climate spiral" de Ed Hawkins -- não é uma
 * espiral matemática de verdade (o raio não cresce monotonicamente com o
 * tempo). Cada ano é um laço fechado completo (ângulo = mês, raio = preço
 * daquele mês), sobreposto aos outros anos na mesma faixa angular; é a COR
 * (fria para anos antigos, quente para recentes) que revela a tendência --
 * se os laços quentes ficam visivelmente mais pra fora que os frios, o olho
 * lê isso como uma espiral se abrindo.
 *
 * Extensão da mesma família do calendário circular (ângulo = mês do ano,
 * sentido horário, 0° no topo) já usado em `timeline/circular-calendario-
 * datas-comemorativas`: aqui o raio carrega uma variável contínua (preço)
 * em vez de só marcar posição, e vários anos se sobrepõem no mesmo círculo.
 */

import { select, scaleLinear, extent } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  ano: string;
  mes: number;
  preco: number;
}

interface Dados {
  meta: { cores: Record<string, string>; anos: string[]; meses: string[] };
  pontos: Ponto[];
}

const VB = 1000;
const RAD = Math.PI / 180;

/** Ângulo (graus, 0 no topo/janeiro, sentido horário) de um mês (1-12), fracionário para posições intermediárias. */
function angulo(mesFracionario: number): number {
  return ((mesFracionario - 1) / 12) * 360;
}

function ponto(mesFracionario: number, raio: number): [number, number] {
  const t = angulo(mesFracionario) * RAD;
  return [raio * Math.sin(t), -raio * Math.cos(t)];
}

const chart: VizChart = {
  aspectRatio: 8 / 9,
  label:
    'Espiral: cinco laços fechados, um por ano de 2021 a 2025, mostrando o preço médio mensal da gasolina — o ' +
    'ângulo marca o mês e o raio marca o preço, com cores frias para anos antigos e quentes para recentes.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, pontos } = data as Dados;

    const escala = VB / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB} ${VB * 1.125}`).attr('aria-hidden', 'true');
    const raiz = svg.append('g').attr('transform', `translate(${VB / 2},${VB / 2 + px(30)})`);

    const R = VB / 2 - px(70);
    const [precoMin, precoMax] = extent(pontos, (d) => d.preco) as [number, number];
    // Raio mínimo não é zero: um "buraco" central deixa os laços mais
    // internos (preços mais baixos, anos mais antigos) legíveis em vez de
    // colapsarem todos perto do centro.
    const raioDe = scaleLinear().domain([precoMin * 0.9, precoMax * 1.08]).range([R * 0.32, R]);

    // Anéis de referência (mesmo preço em radial) -- eco do `axisLeft`
    // cartesiano de outros gráficos, aqui como círculos concêntricos.
    const gGuias = raiz.append('g');
    const ticksPreco = raioDe.ticks(4);
    gGuias
      .selectAll('circle')
      .data(ticksPreco)
      .join('circle')
      .attr('r', (d) => raioDe(d))
      .attr('fill', 'none')
      .attr('stroke', theme.border)
      .attr('stroke-width', px(0.6))
      .attr('stroke-opacity', 0.6);
    gGuias
      .selectAll('text')
      .data(ticksPreco)
      .join('text')
      .attr('x', px(4))
      .attr('y', (d) => -raioDe(d))
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(10))
      .attr('fill', theme.inkMuted)
      .text((d) => `R$ ${d.toFixed(2)}`);

    // ------------------------------------------------------------ meses
    const meses = meta.meses.map((mes, i) => ({ mes, mesNum: i + 1 }));
    const raiosMes = raiz
      .selectAll<SVGLineElement, (typeof meses)[number]>('line.mes')
      .data(meses)
      .join('line')
      .attr('class', 'mes')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (d) => ponto(d.mesNum, R)[0])
      .attr('y2', (d) => ponto(d.mesNum, R)[1])
      .attr('stroke', theme.border)
      .attr('stroke-width', px(0.5))
      .attr('stroke-opacity', 0.5);

    // Rótulo do mês é interativo -- passar o mouse (ou clicar) compara o
    // MESMO mês entre os cinco anos, em vez de um ano inteiro (o realce que
    // já existe por cima do laço/legenda). Útil pra responder "dezembro
    // ficou mais caro ano a ano?" sem precisar seguir cada laço na mão.
    const rotulosMes = raiz
      .selectAll<SVGTextElement, (typeof meses)[number]>('text.mes')
      .data(meses)
      .join('text')
      .attr('class', 'mes')
      .attr('data-interactive', '')
      .style('cursor', 'pointer')
      .attr('x', (d) => ponto(d.mesNum, R + px(22))[0])
      .attr('y', (d) => ponto(d.mesNum, R + px(22))[1])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(12))
      .attr('fill', theme.ink)
      .text((d) => d.mes);

    // ------------------------------------------------------------- laços
    const porAno = new Map<string, Ponto[]>();
    meta.anos.forEach((ano) => porAno.set(ano, []));
    pontos.forEach((p) => porAno.get(p.ano)?.push(p));
    porAno.forEach((lista) => lista.sort((a, b) => a.mes - b.mes));

    // Gerador de linha radial fechando o próprio laço (repete o primeiro
    // ponto no fim) -- equivalente ao 13o ponto duplicado no script.R.
    function caminhoDe(lista: Ponto[]): string {
      const fechado = [...lista, lista[0]];
      return fechado
        .map((p, i) => {
          const [x, y] = ponto(p.mes, raioDe(p.preco));
          return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');
    }

    const gLacos = raiz.append('g');
    const lacos = gLacos
      .selectAll<SVGPathElement, string>('path')
      .data(meta.anos, (d) => d)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', (ano) => meta.cores[ano] ?? theme.primary)
      .attr('stroke-width', px(2.6))
      .attr('stroke-linejoin', 'round')
      .attr('d', (ano) => caminhoDe(porAno.get(ano) ?? []));

    const gPontos = raiz.append('g');
    const todosPontos = gPontos
      .selectAll<SVGCircleElement, Ponto>('circle')
      .data(pontos, (d: Ponto) => `${d.ano}-${d.mes}`)
      .join('circle')
      .attr('data-interactive', '')
      .attr('cx', (d) => ponto(d.mes, raioDe(d.preco))[0])
      .attr('cy', (d) => ponto(d.mes, raioDe(d.preco))[1])
      .attr('r', px(3.4))
      .attr('fill', (d) => meta.cores[d.ano] ?? theme.primary)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1));

    function mostrarTooltip(evento: PointerEvent, d: Ponto) {
      const nomeMes = meta.meses[d.mes - 1];
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.ano]}"></span>` +
          `<strong>${nomeMes} de ${d.ano}</strong><br>R$ ${d.preco.toFixed(2)} / litro`,
        evento
      );
    }
    todosPontos.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    // Duas dimensões de realce, unificadas num só "fixado" (mesma técnica
    // de chave prefixada já usada no diagrama de cordas e no mosaico desta
    // base): realçar por ANO acende o laço inteiro daquele ano; realçar por
    // MÊS acende o mesmo mês nos cinco laços ao mesmo tempo, pra comparar
    // ponto a ponto em vez de laço a laço.
    function realcar(chave: string) {
      if (chave.startsWith('mes:')) {
        const mesNum = Number(chave.slice(4));
        lacos.attr('opacity', 0.2).attr('stroke-width', px(2.6));
        todosPontos.attr('opacity', (d) => (d.mes === mesNum ? 1 : 0.12));
        rotulosMes.attr('fill', (d) => (d.mesNum === mesNum ? meta.cores[meta.anos[meta.anos.length - 1]] : theme.ink));
        raiosMes.attr('stroke-opacity', (d) => (d.mesNum === mesNum ? 1 : 0.5));
        legenda.attr('opacity', 1);
      } else {
        const ano = chave.slice(4);
        lacos.attr('opacity', (a) => (a === ano ? 1 : 0.15)).attr('stroke-width', (a) => (a === ano ? px(3.6) : px(2.6)));
        todosPontos.attr('opacity', (d) => (d.ano === ano ? 1 : 0.15));
        legenda.attr('opacity', (a: string) => (a === ano ? 1 : 0.4));
        rotulosMes.attr('fill', theme.ink);
        raiosMes.attr('stroke-opacity', 0.5);
      }
    }
    function limpar() {
      lacos.attr('opacity', 1).attr('stroke-width', px(2.6));
      todosPontos.attr('opacity', 1);
      legenda.attr('opacity', 1);
      rotulosMes.attr('fill', theme.ink);
      raiosMes.attr('stroke-opacity', 0.5);
    }

    tornarFixavel(
      root,
      [
        { selecao: lacos, chaveDe: (a: string) => `ano:${a}` },
        { selecao: todosPontos, chaveDe: (d: Ponto) => `ano:${d.ano}` },
        { selecao: rotulosMes, chaveDe: (d: (typeof meses)[number]) => `mes:${d.mesNum}` },
      ],
      realcar,
      limpar
    );

    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(meta.anos)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((a) => `<span class="viz-swatch" style="background:${meta.cores[a]}"></span>${a}`)
      .on('pointerenter', (_e, a) => realcar(`ano:${a}`))
      .on('pointerleave', limpar);

    if (animate) {
      const comprimentos = new Map<string, number>();
      lacos.each(function (ano) {
        comprimentos.set(ano, (this as SVGPathElement).getTotalLength());
      });
      lacos
        .attr('stroke-dasharray', (ano) => comprimentos.get(ano) ?? 0)
        .attr('stroke-dashoffset', (ano) => comprimentos.get(ano) ?? 0);
      todosPontos.attr('r', 0);

      lacos
        .transition()
        .delay((_a, i) => stagger(i, meta.anos.length, 380))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('stroke-dashoffset', 0);

      todosPontos
        .transition()
        .delay((d) => stagger(meta.anos.indexOf(d.ano), meta.anos.length, 380) + DURATION.enter * 0.7)
        .duration(DURATION.base)
        .attr('r', px(3.4));

      garantirEstadoFinal(DURATION.enter + 250, () => {
        lacos.interrupt().attr('stroke-dashoffset', 0);
        todosPontos.interrupt().attr('r', px(3.4));
      });
    }
  },
};

export default chart;
