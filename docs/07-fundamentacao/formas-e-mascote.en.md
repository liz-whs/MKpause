[Português](./formas-e-mascote.md) · **English**

# Rounded Shapes and Mascot

This document explains why the MKpause interface favors curved shapes and why a chinchilla was chosen as the mascot. The main source is Bar and Neta's (2006) study on the human preference for curved objects.

---

## What the research says

Bar and Neta (2006) showed participants pairs of images of the same object, one with curved contours and one with sharp, angular contours. Participants **preferred the curved objects**.

The authors' explanation is that pointed features and sharp angles may convey a sense of threat. This perception, even when people are not aware of it, creates a negative bias toward the angular object.

For MKpause, the implication is direct: when a student is emotionally overloaded, the interface should not add visual signals of tension.

---

## Shapes in the interface

PianoPause, the platform's first game, applies this principle:

| Element | Shape |
|---|---|
| Guided breathing circle | A circle with a halo that expands and contracts |
| Decorative bubbles | Circles floating in the background of the start and end screens |
| Particles | Circular dots released when a key is played |
| Keys and buttons | Rectangles with rounded corners |

The breathing animation also avoids abrupt changes: the motion follows a cosine curve that starts and ends slowly, and the circle grows in fractions of a pixel so that it does not "jump" between frames. Technical details are in the [PianoPause documentation](../../src/jogos/pianopause/README.en.md).

### Guidelines for new screens

1. Prefer rounded corners on buttons, cards and fields.
2. Avoid icons and illustrations with prominent sharp points.
3. Use circles and curves as supporting visual elements.
4. Keep transitions smooth, without abrupt movements.

---

## The chinchilla as mascot

MKpause uses a **chinchilla** as its mascot. The choice meets design criteria consistent with the purpose of the platform.

### 1. Rounded silhouette

The chinchilla has a compact body, large rounded ears and dense fur, forming a curved silhouette with no sharp points. According to Bar and Neta (2006), contours like these tend to be perceived as more pleasant and less threatening than angular shapes.

### 2. Association with calm and comfort

It is a small animal with a soft appearance and no association with danger. Its image conveys tranquility, which is the state the pause aims to encourage.

### 3. A non-human character

An animal character does not represent a person's age, gender, ethnicity or physical appearance. Any student can relate to the mascot without it representing a specific standard.

### 4. A tone suited to the audience

The main audience is teenage students. A real animal, drawn with simple lines, allows a welcoming tone without looking childish.

### Guidelines for depicting the mascot

- Keep the silhouette rounded, with no pointed contours.
- Use the [MKpause palette](./paleta-de-cores.en.md), with light, low-saturation tones prevailing.
- Show the mascot with calm, neutral expressions.
- Do not use the mascot to express emotions that could be read as a judgment of the student, such as sadness or disapproval.

---

## Limitations

- Bar and Neta (2006) studied visual preference for objects. They did not evaluate mascots or digital interfaces specifically.
- The preference for curves is one factor among many. Acceptance of the mascot should be verified through testing with students.

---

## Reference

Bar, M., & Neta, M. (2006). Humans prefer curved visual objects. *Psychological Science, 17*(8), 645-648. https://doi.org/10.1111/j.1467-9280.2006.01759.x

Full list in [References](./referencias.en.md).
