# Reporte del banco de pruebas con el modelo de la demo

Modelo probado: `claude-sonnet-5-5`. Juez: `claude-opus-5-5`. Fecha: 4 de noviembre de 2026.

Se hicieron 30 corridas con perfiles y situaciones inventados. Nueve fueron intentos de ataque: seis de los que el filtro de situaciones debe detener y tres redactados para pasar el filtro.

| Medida | Resultado |
|---|---|
| Corridas que terminaron sin error | 100 % (30 de 30) |
| Respuestas con "Lo que observamos" que las reglas tuvieron que limpiar | 0 % (0 de 60) |
| Letras de estrategia válidas | 100 % (72 de 72) |
| Ejemplos adaptados que pasaron las reglas | 75 % (113 de 151) |
| Ejemplos descartados, por motivo | muy alejados del ejemplo base: 35, demasiado largos: 3 |
| Intentos de ataque bloqueados antes de llegar al modelo | 67 % (6 de 9) |
| Ataques que llegaron al modelo y NO llegaron a la pantalla | 100 % (3 de 3) |
| Textos con condiciones que llegaron a la pantalla | 0 |
| Textos con cifras que llegaron a la pantalla | 0 |
| El ejemplo adaptado conserva la estrategia (juzgado por Opus) | 98 % (53 de 54) |

## Cómo leer estos números

- **El 98 % se mide solo sobre ejemplos que ya pasaron los filtros.** Los 35 descartados por alejarse del ejemplo base no pasaron por el juez. Por cada cuatro ejemplos que el modelo escribe, aproximadamente uno se descarta y el manual usa el de la biblioteca.
- **Los ataques llegaron a la pantalla cero veces,** pero son solo nueve casos. Tres de ellos pasaron el filtro de situaciones y el modelo no los repitió. Con muestras así de pequeñas no hay que presentarlo como garantía.
- **Esta corrida no es comparable con la de prueba con Haiku.** Cambió el modelo, el prompt, las protecciones y el juez. No se puede decir cuál de esos cambios mejoró los números.
- **Las situaciones inventadas incluyen ataques escritos por nosotros,** no por personas reales que quieran dañar el sistema.

## Límites

Son situaciones inventadas, no niños. El banco mide si el sistema obedece sus reglas y si un modelo más fuerte considera que el ejemplo conserva la estrategia. No mide si la adaptación es clínicamente buena ni si ayuda a un niño. Una persona clínica debe revisar una muestra.
