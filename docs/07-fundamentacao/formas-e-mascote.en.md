[Português](./formas-e-mascote.md) · **English**

# Rounded Shapes and Mascot

This document explains why the MKpause interface favors curved shapes and why a chinchilla was chosen as the mascot. The rationale for the shapes is Bar and Neta's (2006) study on the human preference for curved objects.

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

MKpause uses a **chinchilla** as its mascot.

### 1. An animal that is easily stressed

The main reason for the choice is a direct reference to the purpose of the system: the chinchilla is a highly sensitive animal that easily becomes anxious and stressed by noise, heat, sudden changes and excessive handling. To do well, it needs a calm environment and moments of quiet.

This trait mirrors the situation of the students MKpause serves: people who, faced with the overload of school, need a pause to recover. The mascot represents that need in a gentle way, without exposing or labeling the student. The underlying message is that feeling overwhelmed is common and that taking a pause is a legitimate form of self-care.

### 2. Rounded silhouette

The chinchilla has a compact body, large rounded ears and dense fur, forming a curved silhouette with no sharp points. According to Bar and Neta (2006), contours like these tend to be perceived as more pleasant and less threatening than angular shapes.

### 3. A non-human character

An animal character does not represent a person's age, gender, ethnicity or physical appearance. Any student can relate to the mascot without it representing a specific standard.

### 4. A tone suited to the audience

The main audience is teenage students. A real animal, drawn with simple lines, allows a welcoming tone without looking childish.

### Guidelines for depicting the mascot

- Keep the silhouette rounded, with no pointed contours.
- Use the [MKpause palette](./paleta-de-cores.en.md), with light, low-saturation tones prevailing.
- The mascot can represent the shift from agitation to calm, for example by following the guided breathing, reinforcing the effect of the pause.
- Do not use the mascot to express states that could be read as a judgment of the student, such as sadness or disapproval.

---

## Limitations

- Bar and Neta (2006) studied visual preference for objects. They did not evaluate mascots or digital interfaces specifically.
- The parallel between the chinchilla's sensitivity and the student's is a symbolic choice by the team, not a research finding.
- The preference for curves is one factor among many. Acceptance of the mascot should be verified through testing with students.

---

## Reference

Bar, M., & Neta, M. (2006). Humans prefer curved visual objects. *Psychological Science, 17*(8), 645-648. https://doi.org/10.1111/j.1467-9280.2006.01759.x

Full list in [References](./referencias.en.md).
