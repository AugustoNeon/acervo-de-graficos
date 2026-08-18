/**
 * Radar (spider) chart com múltiplos grupos — versão em D3.
 *
 * `fmsb::radarchart()` é grafismo base do R (sem widget interativo pronto),
 * então essa é a primeira versão interativa desse gráfico (`interactive:
 * false` antes). A geometria é uma grade regular — eixos igualmente
 * espaçados, escala linear do centro pra fora — então o D3 recalcula tudo a
 * partir dos MESMOS dados brutos do `data.json`, sem precisar exportar
 * geometria pré-calculada do R.
 *
 * O que a imagem não dá: passar o cursor num vértice mostra o valor exato
 * daquele personagem naquele atributo, e passar o cursor num grupo (no
 * polígono ou na legenda) isola ele, apagando os outros dois.
 */

import { select } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Grupo {
  nome: string;
  cor: string;
  /** Um valor por eixo, na mesma ordem de meta.eixos. */
  valores: number[];
}

interface Dados {
  meta: { eixos: string[]; min: number; max: number; grade: number[]; nota?: string };
  grupos: Grupo[];
}

const VB = 640;
const OPACIDADE_PREENCHIMENTO = 0.32;
const OPACIDADE_PREENCHIMENTO_APAGADA = 0.05;
const OPACIDADE_LINHA_APAGADA = 0.15;

/** Alvo de realce: um grupo, ou nada (estado neutro). */
type Foco = string | null;

const chart: VizChart = {
  aspectRatio: 1,
  label:
    'Radar chart comparando 3 personagens fictícios de RPG (Guerreiro, Mago, Ladino) em 5 atributos: ' +
    'Força, Inteligência, Destreza, Vitalidade e Carisma.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, grupos } = data as Dados;
    const { eixos, min, max, grade } = meta;
    const n = eixos.length;

    const escala = VB / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const R = VB / 2 - px(90);
    const escalaRaio = (v: number) => ((v - min) / (max - min)) * R;

    // fmsb::radarchart() desenha os eixos em SENTIDO ANTI-HORÁRIO a partir do
    // topo (confirmado comparando com o output.png — é o oposto do sentido
    // horário mais comum em gráfico polar deste acervo, ex: circular
    // barplot). O sinal negativo aqui é o que faz a versão interativa bater
    // com a estática; sem ele os eixos saem espelhados.
    const anguloEixo = (i: number) => -Math.PI / 2 - i * ((2 * Math.PI) / n);
    const ponto = (i: number, raio: number): [number, number] => {
      const a = anguloEixo(i);
      return [raio * Math.cos(a), raio * Math.sin(a)];
    };

    const pathPoligono = (valores: number[]) =>
      valores
        .map((v, i) => {
          const [x, y] = ponto(i, escalaRaio(v));
          return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ') + 'Z';

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `${-VB / 2} ${-VB / 2} ${VB} ${VB}`)
      .attr('aria-hidden', 'true');

    const raiz = svg.append('g');
    const camadaGrade = raiz.append('g');
    const camadaGrupos = raiz.append('g');
    const camadaTexto = raiz.append('g');

    // ----------------------------------------------------------------- grade
    // Anéis poligonais concêntricos (não círculos) — mesma malha "de teia" do
    // `cglty=1` do fmsb — mais os raios do centro até cada eixo.
    camadaGrade
      .selectAll('path.anel')
      .data(grade)
      .join('path')
      .attr('class', 'anel')
      .attr('d', (nivel) => pathPoligono(eixos.map(() => nivel)))
      .attr('fill', 'none')
      .attr('stroke', theme.border)
      .attr('stroke-width', px(1));

    camadaGrade
      .selectAll('line.raio')
      .data(eixos)
      .join('line')
      .attr('class', 'raio')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (_e, i) => ponto(i, R)[0])
      .attr('y2', (_e, i) => ponto(i, R)[1])
      .attr('stroke', theme.border)
      .attr('stroke-width', px(1));

    // Números da escala, subindo pelo primeiro eixo (mesma posição do fmsb).
    camadaTexto
      .selectAll('text.escala')
      .data(grade.filter((v) => v > min))
      .join('text')
      .attr('class', 'escala')
      .attr('x', (v) => ponto(0, escalaRaio(v))[0] + px(6))
      .attr('y', (v) => ponto(0, escalaRaio(v))[1])
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(11))
      .attr('fill', theme.inkMuted)
      .text((v) => String(v));

    // Rótulo de cada eixo, ancorado pra fora — o lado (esquerda/centro/
    // direita) depende de que quadrante o eixo cai.
    camadaTexto
      .selectAll('text.eixo')
      .data(eixos)
      .join('text')
      .attr('class', 'eixo')
      .attr('transform', (_e, i) => {
        const [x, y] = ponto(i, R + px(26));
        return `translate(${x},${y})`;
      })
      .attr('text-anchor', (_e, i) => {
        const x = ponto(i, 1)[0];
        return Math.abs(x) < 0.15 ? 'middle' : x > 0 ? 'start' : 'end';
      })
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 600)
      .attr('font-size', px(15))
      .attr('fill', theme.ink)
      .text((e) => e);

    // ---------------------------------------------------------------- grupos
    const poligonos = camadaGrupos
      .selectAll<SVGPathElement, Grupo>('path.grupo')
      .data(grupos)
      .join('path')
      .attr('class', 'grupo')
      .attr('d', (g) => pathPoligono(g.valores))
      .attr('fill', (g) => g.cor)
      .attr('fill-opacity', OPACIDADE_PREENCHIMENTO)
      .attr('stroke', (g) => g.cor)
      .attr('stroke-width', px(2.5))
      .attr('data-interactive', '');

    const vertices = camadaGrupos
      .selectAll<SVGCircleElement, { g: Grupo; i: number }>('circle.vertice')
      .data(grupos.flatMap((g) => g.valores.map((_v, i) => ({ g, i }))))
      .join('circle')
      .attr('class', 'vertice')
      .attr('cx', (d) => ponto(d.i, escalaRaio(d.g.valores[d.i]))[0])
      .attr('cy', (d) => ponto(d.i, escalaRaio(d.g.valores[d.i]))[1])
      .attr('r', px(5))
      .attr('fill', (d) => d.g.cor)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.5))
      .attr('data-interactive', '');

    // -------------------------------------------------------------- interacao
    const realcar = (foco: Foco) => {
      poligonos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (g) =>
          !foco || g.nome === foco ? OPACIDADE_PREENCHIMENTO : OPACIDADE_PREENCHIMENTO_APAGADA
        )
        .attr('stroke-opacity', (g) => (!foco || g.nome === foco ? 1 : OPACIDADE_LINHA_APAGADA));

      vertices
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => (!foco || d.g.nome === foco ? 1 : OPACIDADE_LINHA_APAGADA));
    };

    vertices
      .on('pointerenter', function (evento: PointerEvent, d) {
        realcar(d.g.nome);
        tooltip.show(`${eixos[d.i]}: <strong>${d.g.valores[d.i]}</strong> — ${d.g.nome}`, evento);
      })
      .on('pointermove', (evento: PointerEvent, d) =>
        tooltip.show(`${eixos[d.i]}: <strong>${d.g.valores[d.i]}</strong> — ${d.g.nome}`, evento)
      )
      .on('pointerleave', () => {
        realcar(null);
        tooltip.hide();
      });

    poligonos
      .on('pointerenter', (_evento, g) => realcar(g.nome))
      .on('pointerleave', () => realcar(null));

    // --------------------------------------------------------------- legenda
    select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(grupos)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((g) => `<span class="viz-swatch" style="background:${g.cor}"></span>${g.nome}`)
      .on('pointerenter', (_e, g) => realcar(g.nome))
      .on('pointerleave', () => realcar(null))
      .on('focus', (_e, g) => realcar(g.nome))
      .on('blur', () => realcar(null));

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Cada polígono cresce do centro pra fora, um grupo depois do outro — a
    // grade e os rótulos aparecem primeiro, servindo de "régua" antes de
    // qualquer forma ocupar espaço nela.
    if (animate) {
      camadaGrade.attr('opacity', 0).transition().duration(DURATION.base).attr('opacity', 1);
      camadaTexto
        .attr('opacity', 0)
        .transition()
        .delay(DURATION.base * 0.6)
        .duration(DURATION.base)
        .attr('opacity', 1);

      const centro = eixos.map(() => min);
      poligonos
        .attr('d', pathPoligono(centro))
        .transition()
        .delay((_g, i) => DURATION.base + stagger(i, grupos.length, 360))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attrTween('d', (g) => {
          const de = centro;
          const ate = g.valores;
          return (t: number) => pathPoligono(de.map((v0, i) => v0 + (ate[i] - v0) * t));
        });

      vertices
        .attr('opacity', 0)
        .transition()
        .delay(DURATION.enter * 0.9)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter * 1.8, () => {
        poligonos.interrupt().attr('d', (g) => pathPoligono(g.valores));
        vertices.interrupt().attr('opacity', 1);
        camadaGrade.interrupt().attr('opacity', 1);
        camadaTexto.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
