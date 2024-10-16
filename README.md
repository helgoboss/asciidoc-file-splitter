# AsciiDoc file splitter

Small **hacky** program that splits one large AsciiDoc file into multiple smaller ones according to its sections. I used it to split [this file](https://github.com/helgoboss/helgobox/blob/3498463aef9350b7ce5a44b95c7046991bb8018c/doc/realearn-user-guide.adoc) into multiple smaller ones in order to generate the [Antora-powered](https://antora.org/) documentation website https://docs.helgoboss.org.

## Setup

Sorry, I didn't invest any time in proper packaging, so you have to do things manually.

1. Install NodeJS (tested with 20.11.1) for getting NPM
2. Install Bun (or any other natively TypeScript-capable JavaScript runtime)
3. Run `npm install`

## Usage


```sh
bun index.ts my-large-file.adoc
```

This should generate a `target` directory with an Antora navigation file (`nav.adoc`) and splitted pages. If you run this again, you should manually delete the `target` directory.

You can do recursive splitting by annotating a section with a `split` attribute. The value of that attribute denotes the recursion level. 0 means, it won't split this section at all. 1 means, it will split all sub sections. 2 means, it will split all sub- and sub-sub sections. You can override this for sub sections.

```adoc
[split=2]
== User interface

=== Window 1

==== Area 1

==== Area 2

=== Window 2

==== Area 1

==== Area 2

[split=0]
=== Misc

==== Button 1

==== Button 2
```

Above example will split the section "User interface" like this:

- Window 1
    - Area 1
    - Area 2
- Window 2
    - Area 1
    - Area 2
- Misc