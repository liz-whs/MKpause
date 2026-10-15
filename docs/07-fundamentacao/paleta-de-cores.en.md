[Português](./paleta-de-cores.md) · **English**

# Color Palette

This document explains how the MKpause palette was built and why it suits a platform for pausing and self-regulation. The main source is Valdez and Mehrabian's (1994) study on the effects of color on emotions.

---

## What the research says

Valdez and Mehrabian (1994) studied emotional reactions to Munsell color samples, separating the three attributes of a color:

| Attribute | Meaning | In the Munsell system |
|---|---|---|
| Hue | The color "family": blue, green, red, etc. | Hue |
| Brightness | How light or dark the color is | Value |
| Saturation | How vivid or greyish the color is | Chroma |

Reactions were measured with the **Pleasure-Arousal-Dominance** (PAD) model, which describes an emotional state along three dimensions:

- **Pleasure:** how pleasant the experience is;
- **Arousal:** the level of activation or agitation;
- **Dominance:** the sense of being in control of the situation.

### Brightness and saturation

Brightness and saturation had strong and consistent effects. The authors summarized these effects in regression equations, where **B** is brightness and **S** is saturation:

```text
Pleasure   = 0.69 B + 0.22 S
Arousal    = -0.31 B + 0.60 S
Dominance  = -0.76 B + 0.32 S
```

Reading the coefficients:

- **brightness** is the main driver of pleasure: lighter colors were rated as more pleasant;
- **saturation** is the main driver of arousal: more vivid colors were more stimulating;
- brightness has a **negative** weight on arousal: light colors tend to be less agitating.

For a platform designed to help students slow down, the target combination is **high pleasure and low arousal**. The equations point to **light, low-saturation** colors, commonly called pastels.

### Hue

The study also compared color families:

| Effect | Hues |
|---|---|
| Most pleasant | blue, blue-green, green, red-purple, purple, purple-blue |
| Least pleasant | yellow, green-yellow |
| Most arousing | green-yellow, blue-green, green |
| Least arousing | purple-blue, yellow-red |

---

## The MKpause palette

The table lists each color with objective measurements. **L\*** (lightness) and **C\*** (chroma) come from the CIELAB color space and serve as equivalents of brightness and saturation: the higher the L\*, the lighter the color; the higher the C\*, the more vivid it is. The Munsell family is an approximation calculated from the hue angle.

| Name | Hex | L\* | C\* | Approximate Munsell family | Use in PianoPause |
|---|---|---:|---:|---|---|
| Peony | `#F7DDD5` | 90.0 | 10.5 | red / yellow-red | Background of every screen |
| Lavender | `#CCC3D1` | 79.9 | 8.2 | purple / red-purple | Breathing circle, lines, note C |
| Sky | `#AFB8CD` | 74.7 | 11.7 | purple-blue | Center of the circle, note E |
| Leaf | `#C1BC77` | 75.2 | 36.5 | yellow / green-yellow | Selected button, note D |
| Dusty Rose | `#D8A4AF` | 72.4 | 20.9 | red-purple | Note G |
| Grass | `#8D8B4C` | 56.7 | 34.9 | yellow / green-yellow | Hit line, board border |
| Jungle | `#65613F` | 40.7 | 20.4 | yellow / green-yellow | Secondary buttons |
| Cacao | `#594131` | 29.7 | 16.0 | yellow-red | Text and primary buttons |
| Cacao Hover | `#9D7D63` | 54.8 | 20.7 | yellow-red | Primary buttons on hover |

---

## How the research applies

### 1. Large surfaces are light and low in saturation

The background (Peony) is the color students see throughout the session. It has the highest lightness in the palette (L\* 90) and low chroma (10.5). According to Valdez and Mehrabian's equations, this combination favors pleasure and reduces arousal.

Lavender and Sky, used in the breathing circle, follow the same pattern: light (L\* 75 to 80) and with the lowest chroma in the palette (8 to 12).

### 2. The central hues are among the most pleasant

Lavender (purple), Sky (purple-blue) and Dusty Rose (red-purple) belong to the families rated most pleasant in the study. Purple-blue is also among the **least arousing** hues, which supports its use at the center of the breathing circle.

The background, close to the yellow-red family, belongs to the other family rated among the least arousing.

### 3. Dark colors serve readability

Cacao and Jungle are dark by necessity: text and buttons need contrast against the background. The [Non-Functional Requirements](../02-requisitos/requisitos-nao-funcionais.en.md) require sufficient contrast (RNF12).

Contrast measured with the WCAG 2.1 formula:

| Combination | Contrast | WCAG 2.1 criterion |
|---|---:|---|
| Cacao on Peony | 7.31 : 1 | Meets AAA for normal text (minimum 7 : 1) |
| Jungle on Peony | 4.88 : 1 | Meets AA for normal text |
| White `#FFFAF7` on Cacao (primary button text) | 9.11 : 1 | Meets AAA for normal text |
| White `#FFFAF7` on Cacao Hover (primary button on hover) | 3.65 : 1 | Meets AA for large text only (minimum 3 : 1) |
| White `#FFFAF7` on Jungle (secondary button text) | 6.08 : 1 | Meets AA for normal text |
| Cacao on Leaf (selected button) | 4.82 : 1 | Meets AA for normal text |

### 4. The olive tones are accents

Leaf, Grass and Jungle belong to the yellow / green-yellow family, which the study rated as **less pleasant** and, in the case of green-yellow, **more arousing**. For this reason, these colors should remain limited to details: the selected button, the hit line, borders and secondary buttons.

They serve a practical purpose: they set interactive elements apart from the background without resorting to saturated colors such as bright red or orange.

---

## Recommendations for the interface

1. Keep backgrounds and large areas in light, low-saturation tones (as a reference, L\* above 70 and C\* below 20).
2. Do not increase the saturation of the olive tones or use them as screen backgrounds.
3. Use Cacao for text on light backgrounds.
4. In the hover state (Cacao Hover), keep button text large (at least 18.66 px bold or 24 px regular), since its contrast with white text is 3.65 : 1. Because hover is a temporary state the user triggers by pointing at the button, this value is acceptable for large text.
5. Do not convey information through color alone (RNF14). In PianoPause, each column also has its own musical note, which already follows this principle.

---

## Limitations

- The study was conducted with adults in a laboratory setting, using isolated color samples. An interface combines several colors at once.
- The conversion from hexadecimal values to Munsell families is approximate.
- The research informs design choices but does not replace usability testing with MKpause's audience.

---

## Reference

Valdez, P., & Mehrabian, A. (1994). Effects of color on emotions. *Journal of Experimental Psychology: General, 123*(4), 394-409. https://doi.org/10.1037/0096-3445.123.4.394

Full list in [References](./referencias.en.md).
