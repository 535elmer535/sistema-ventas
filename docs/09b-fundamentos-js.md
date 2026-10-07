# Guía 9B — Fundamentos de JavaScript

## Actividad B — Destructuring y template strings

Creé un objeto producto con nombre, precio y existencia.
Usé destructuring para extraer nombre y precio en variables.
Usé un template string para mostrar esos valores en una frase.

Resultado comprobado en la consola:
Ropero de melamina cuesta Bs 1200

## Actividad C — Métodos de arreglos

- map: obtuve una lista con los nombres de los cuatro muebles.
- filter: seleccioné los muebles con existencia menor a 10:
  Ropero de melamina y Centro de TV.
- find: encontré el Escritorio, con precio 500 y existencia 12.
- reduce: sumé los precios de los cuatro modelos y obtuve Bs 2750.

Ejecuté los cuatro ejercicios en la consola del navegador
y comprobé sus resultados.

## Actividad D — Promesas y async/await

Con await, la función esperó aproximadamente un segundo
y después mostró el resultado "Listo".

Al quitar await, el código continuó inmediatamente.
El segundo mensaje mostró una Promise pendiente,
porque el resultado todavía no estaba disponible.

Después de comparar ambos comportamientos, restauré await.

## Actividad E — Lista de muebles con DOM

Creé practica-dom.html con un botón y una lista vacía.
Usé querySelector para seleccionar ambos elementos
y addEventListener para responder al clic.

Con map convertí los nombres en elementos li,
con join("") los uní y con innerHTML los mostré en la lista.

Comprobé en el navegador que al pulsar el botón
aparecen los cuatro muebles.
