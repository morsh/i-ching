# SEO copy specification — Seraph

## 1. Page title

I Ching Oracle: Cast Coins for a Hexagram Reading

## 2. Meta description

Ask a question, cast a traditional three-coin I Ching hexagram line by line, and read a private, reflective guide to changing lines and transformation.

## 3. Open Graph and Twitter card text

**og:title:** I Ching Oracle: Cast a Hexagram with Three Coins

**og:description:** Ask a question, cast six I Ching lines from the bottom up, and read a reflective hexagram interpretation with changing lines.

**og:image:alt:** Violet seal with the Chinese character 易 beside six I Ching lines and the words “I Ching Oracle”.

**twitter:title:** I Ching Oracle: Cast a Hexagram with Three Coins

**twitter:description:** Cast the I Ching online using the traditional three-coin method, then read the primary hexagram, changing lines, and transformation.

**Share image spec:** A restrained violet card with the 易 seal icon, a clean six-line hexagram mark, the title “I Ching Oracle”, and a small subtitle: “Three coins. Six lines. A reflective reading.”

## 4. Static landing-page content

### I Ching Oracle

The I Ching, or Book of Changes, is one of the oldest texts in the Chinese tradition: a book of images, judgments, and line statements used for reflection on change. It does not offer a prediction in the modern sense. A reading is better understood as a structured way to examine a question: what is forming, what is under strain, what is stable, and what may be changing.

This oracle uses the traditional three-coin method. You begin with a question or situation held clearly in mind, then cast six lines. Each line is made from three coins. Heads count as three, tails count as two; the total gives one of four line values: old yin, young yang, young yin, or old yang. Young lines are stable. Old lines are changing lines: yin may turn into yang, or yang may turn into yin.

A complete cast forms a hexagram: six broken or solid lines. The I Ching builds the hexagram from the ground upward, so this site throws the lines in the same order. The first throw becomes line 1, the bottom line. The sixth throw becomes line 6, the top line. The finished figure is read as a whole, but its order matters: the lower lines often suggest beginnings, foundations, or inward conditions, while the upper lines suggest development, culmination, or outward expression.

After the sixth throw, the reading names the primary hexagram and shows its Judgment and Image. If any lines are changing, their line texts are part of the reading too. Those changing lines also produce a transformed hexagram, showing the pattern that emerges when the old lines turn into their opposites. Read the primary hexagram first, then the changing lines, then the transformed hexagram as a direction of movement rather than a guaranteed outcome.

Your question is not transmitted. Nothing is stored unless you choose to save a reading locally; if you do choose to save, the saved reading includes the question so you can return to its context later.

## 5. Heading outline

- h1: I Ching Oracle
  - h2: Cast a hexagram with the three-coin method
    - h3: How the coin values become lines
    - h3: Why the lines are cast from the bottom up
  - h2: How to read your I Ching result
    - h3: The primary hexagram
    - h3: Changing lines
    - h3: The transformed hexagram
  - h2: A reflective tool, not a prediction
  - h2: Privacy while you cast

## 6. Per-hexagram page copy template

### Title pattern

Hexagram {number}: {name} ({chineseName}) | I Ching

If the title would exceed search-result length for longer names, use:

I Ching Hexagram {number}: {name}

### Meta description pattern

Read I Ching Hexagram {number}, {name} ({chineseName}, {translation}): judgment, image, trigrams, and all six line texts for reflection.

### Heading structure

- h1: Hexagram {number}: {name} — {chineseName} {pinyin}
  - h2: What Hexagram {number} means
  - h2: The Judgment
  - h2: The Image
  - h2: Trigrams: {lowerTrigram} below, {upperTrigram} above
  - h2: The six lines of Hexagram {number}
    - h3: Line 1 — bottom line
    - h3: Line 2
    - h3: Line 3
    - h3: Line 4
    - h3: Line 5
    - h3: Line 6 — top line
  - h2: When this hexagram has changing lines
  - h2: Cast another I Ching reading

### Thin-content risk and required meaningful variation

A 64-page set must not be only a swapped title, the same boilerplate paragraph, and a call to action. Each page must expose the actual per-hexagram corpus content already present in `app/src/data/hexagrams.ts`:

- King Wen number and binary pattern.
- Chinese name, pinyin, and English name.
- Lower and upper trigram names.
- The unique Judgment text.
- The unique Image text.
- All six unique line texts, labelled bottom-to-top.

The “What Hexagram {number} means” section should vary meaningfully per page. It can be generated from the existing Judgment, Image, name, and trigram pair, but it should produce a real paragraph about that hexagram’s specific theme rather than a generic “this hexagram means change” sentence. The “When this hexagram has changing lines” section should also vary by referencing the character of that hexagram and then directing the reader to the six line texts.

The existing corpus is substantial enough to be the foundation: it contains 64 distinct hexagram records, 64 judgments, 64 images, 64 trigram pairs, and 384 line texts. It is not enough if the pages hide that material behind a thin template or show only a name and two sentences. Render the corpus openly, with a unique summary and all six lines on each page.

## 7. Question-led sections worth adding

- **What do changing lines mean in the I Ching?** Explain old yin and old yang, why they transform, and how to read line texts without treating them as fixed predictions.
- **Why are I Ching lines cast from the bottom up?** Explain the construction of the hexagram and the site’s line-by-line ritual.
- **What is a transformed hexagram?** Explain primary pattern, changing lines, and resulting pattern as movement or tension, not guaranteed future events.
- **How does the three-coin method work?** Give the heads/tails values, sums 6–9, and the meaning of each value.
- **What kind of question should I ask the I Ching?** Encourage open, reflective questions about a situation rather than yes/no demands or requests for certainty.
- **How is the I Ching different from tarot?** Answer carefully: both are interpretive systems, but the I Ching is organized around hexagrams, line change, and a classical Chinese textual tradition rather than a deck of images.
- **Is an online I Ching casting private?** State only the actual guarantees: the question is not transmitted; nothing is stored unless the user chooses to save, and saving includes the question.

