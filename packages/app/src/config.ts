import {
  collectionParser,
  colorParser,
  createParsers,
  numberParser,
  rangeParser,
} from "@web-art/config-parser";

export const config = createParsers({
  "bg-colour": colorParser({ label: "Background Colour", default: "2F9D0F" }),
  "wire-colour": colorParser({ label: "Wire Colour", default: "FFF1BD" }),
  "resistor-bg-colour": colorParser({
    label: "Resistor Background Colour",
    default: "C2B498",
  }),
  "move-speed": rangeParser({
    label: "Movement Speed",
    default: 1.5,
    attrs: { min: "0", max: "10", step: "0.1" },
  }),
  "place-speed": rangeParser({
    label: "Placement Speed",
    default: 0.2,
    attrs: { min: "0", max: "5", step: "0.05" },
  }),
  "random-cell-chance": rangeParser({
    label: "Random Cell Placement Chance",
    default: 0.0002,
    attrs: { min: "0", max: "0.1", step: "0.0001" },
  }),
  "cell-size": numberParser({
    label: "Cell Size (px)",
    default: 50,
    attrs: { min: "0", max: "1000", step: "1" },
  }),
  "resistor-chance": rangeParser({
    label: "Resistor Chance",
    default: 0.05,
    attrs: { min: "0", max: "1", step: "0.01" },
  }),
  "place-chance": rangeParser({
    label: "Cell Placement Chance",
    default: 0.07,
    attrs: { min: "0", max: "1", step: "0.01" },
  }),
  "resistor-colours": collectionParser({
    label: "Resistor Colours",
    expandable: true,
    fields: [colorParser({ label: "Colour" })],
    default: [
      ["E70000"],
      ["FF8C00"],
      ["FFEF00"],
      ["00811F"],
      ["0044FF"],
      ["760089"],
    ],
  }),
  directions: collectionParser({
    label: "Connection Directions",
    expandable: true,
    fields: [
      numberParser({
        label: "Delta X",
        title: "A direction of (0, 0) will be ignored.",
      }),
      numberParser({
        label: "Delta Y",
        title: "A direction of (0, 0) will be ignored.",
      }),
    ],
    default: [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ],
  }),
});
