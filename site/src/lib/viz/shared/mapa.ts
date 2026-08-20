/**
 * Primitivas compartilhadas por gráficos geográficos do site (D3 + GeoJSON
 * exportado por `sf::st_write()` no R).
 *
 * Extraído depois do segundo gráfico a precisar da mesma correção de
 * enrolamento (o primeiro foi `dashboard-inovacao-ggiraph`) — mesmo espírito
 * de `cartesiano.ts`/`densidade.ts`: uma técnica reimplementada do zero em
 * dois gráficos vira primitiva compartilhada no terceiro-segundo uso, não
 * antes (não vale generalizar a partir de um único caso).
 */

export interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{ type: 'Feature'; properties: unknown; geometry: unknown }>;
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
 * INCONSISTENTE entre features — uns anti-horário, outros horário, sem um
 * padrão óbvio (não é "todo mundo invertido", uma correção cega piora
 * metade e conserta a outra). Sem o sentido que o `d3-geo` espera pro
 * clipping esférico, uma geometria desenha como "o globo inteiro preenchido
 * menos um buraco no formato dela" — um blob cobrindo o mapa todo em vez da
 * forma sozinha. `d3.geoPath()` não expõe opção pra isso, então a correção é
 * por polígono: medir a área com sinal de cada anel e forçar o anel externo
 * pro sentido horário (o que o d3-geo espera, testado empiricamente) e cada
 * furo pro sentido oposto do seu externo — a regra geral de anel externo vs.
 * furo, não um sentido fixo pros dois. Corrige por conta própria não importa
 * o que veio de cada feature. Muta a FeatureCollection recebida.
 */
export function corrigirEnrolamento(fc: GeoFeatureCollection): void {
  fc.features.forEach((f) => {
    const geom = f.geometry as { type?: string; coordinates?: unknown };
    // Polygon: coordinates = anel[][]; MultiPolygon: coordinates = poligono[][][]
    const poligonos: number[][][][] =
      geom.type === 'Polygon' ? [geom.coordinates as number[][][]] : (geom.coordinates as number[][][][]) ?? [];
    poligonos.forEach((aneis) => {
      aneis.forEach((anel, i) => {
        const area = areaComSinal(anel);
        const precisaNegativa = i === 0;
        if (precisaNegativa ? area > 0 : area < 0) anel.reverse();
      });
    });
  });
}
