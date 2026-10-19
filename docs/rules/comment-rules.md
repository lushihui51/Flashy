# Comment rules

**Reader.** The reader knows the language, the libraries, and AGENTS.md. The reader has not read any ADR, PDR, or cycle file.

**Scope.** The rules apply to every hand-written comment in every file of the repository. A comment's kind is set by where it sits; a comment directly above a declaration belongs to that declaration.

## Interface comment

**Sits.** At the declaration of a module, class, named function, method, component, hook, or type, wherever it is declared, including inside another function or component: the docstring in Python, the block directly above in TypeScript. In TypeScript, a module's interface comment sits at the top of the file, above the imports.

**Answers.** "How do I use this correctly", for the code that uses the declaration, which never has to read the body.

**Needed when.** The declaration, its name, parameters and types, cannot answer "how do I use this correctly" without ambiguity.

**States.** Whichever of these the declaration does not already answer:

1. What it does or represents, as its user sees it.
2. What an argument or the return value means, including what null or empty means.
3. What it raises or throws.
4. Its side effects.
5. Its preconditions: what must be true before it is used.

Written as prose, never as fixed sections to fill in.

**Never.** How the body works. An ADR or PDR number.

**Test.** A sentence that could become false through a change to the body, without any user having to react, does not belong.

## Implementation comment

**Sits.** On the statements inside a function or component body, JSX included, on local variables, on module-level constants, and on inline functions: functions with no name of their own, written inside the expression that uses them.

**Answers.** "What is this for, and why is it here", for the reader of the body.

**Needed when.** The statements cannot answer "what is this for, and why is it here" on a first read, without ambiguity.

**States.** What the code there does and why, in its own words. An ADR or PDR number may follow the reason, in parentheses, only when a reader about to change that code must read the record first, because the full reasoning is longer than a comment can hold.

**Never.** How the code works.

**Test.** A sentence that is the code translated into English does not belong.

## Member comment

**Sits.** Next to the declaration of one field of a class or type: a model column, a class attribute, an enum member, or a member of a props or other type.

**Answers.** "What is this", for the code that reads or writes the field.

**Needed when.** The value's name and type cannot answer "what is this" without ambiguity.

**States.** Whichever of these the name and type do not already answer:

1. What the value represents.
2. Its units or range.
3. What null or empty means.
4. What is always true of it, which every writer must keep.

A fact about one member is stated at that member, not repeated in the comment of the class or type around it.

**Never.** What code does with it. An ADR or PDR number.

**Test.** A sentence that could become false through a change to the code that reads or writes the field, without the field's meaning changing, does not belong.

## Every comment

**Only what is needed.** A comment is written when, and only when, the reader needs it: without it they would have to guess, or read code they should not have to read. A comment that is needed says only what the reader needs; what the reader already has is left out.

**Present state.** A comment describes the code as it is now. It never says what the code used to be, what it replaced, when it was added, or what will be done later. The test: a sentence that only makes sense to a reader who saw an earlier version does not belong. A `TODO(defer:<tag>)` marker is the one exception: it says what is deferred.

**References.** A comment gives its reason in its own words and is complete without any reference.
