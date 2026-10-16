# Comment rules

## Vocabulary

Each kind is defined by where the comment sits and what it is for.

- Interface comment: sits at the declaration of a module, class, named function, method, component, hook, or type, wherever it is declared, including inside another function or component (the docstring in Python, the block directly above in TypeScript). It says how to use the code.
- Implementation comment: sits on the statements inside a function or component body (JSX included), on local variables, on module-level constants, and on inline functions: functions with no name of their own, written inside the expression that uses them. It says what the code there does and why.
- Member comment: sits next to the declaration of one field of a class or type: a model column, a class attribute, an enum member, or a member of a props or other type. It says what that value is.

In TypeScript, a module's interface comment sits at the top of the file, above the imports. A comment directly above a declaration belongs to that declaration.

## Scope

The rules apply to every hand-written comment in every file of the repository.

## Rule 1: when a comment is written

A comment is written when, and only when, the reader needs it: without it they would have to guess, or read code they should not have to read.

The reader knows the language, the libraries, and AGENTS.md. The reader has not read any ADR, PDR, or cycle file.

- A reader needs an interface comment if and only if the declaration (name, parameters, types) cannot answer "how do I use this correctly" without ambiguity.
- A reader needs an implementation comment if and only if the statements cannot answer "what is this for, and why is it here" on a first read, without ambiguity.
- A reader needs a member comment if and only if the value's name and type cannot answer "what is this" without ambiguity.

A comment that is needed says only what the reader needs; what the reader already has is left out.

## Rule 2: interface comments

An interface comment answers "how do I use this correctly" for the code that uses the declaration, which never has to read the body. It states whichever of these the declaration does not already answer:

1. What it does or represents, as its user sees it.
2. What an argument or the return value means, including what null or empty means.
3. What it raises or throws.
4. Its side effects.
5. Its preconditions: what must be true before it is used.

It is written as prose, never as fixed sections to fill in.

It never says how the body works. The test: a sentence that could become false through a change to the body, without any user having to react, does not belong.

## Rule 3: implementation comments

An implementation comment never says how the code works. The test: a sentence that is the code translated into English does not belong.

## Rule 4: references

A comment gives its reason in its own words and is complete without any reference.

An ADR or PDR number may be added only to an implementation comment, and only when a reader about to change that code must read the record first, because the full reasoning is longer than a comment can hold. The number follows the reason, in parentheses.

An interface comment or a member comment never carries an ADR or PDR number.

## Rule 5: present state

A comment describes the code as it is now. It never says what the code used to be, what it replaced, when it was added, or what will be done later.

The test: a sentence that only makes sense to a reader who saw an earlier version does not belong.

A `TODO(defer:<tag>)` marker is the one exception: it says what is deferred.

## Rule 6: member comments

A member comment answers "what is this" for the code that reads or writes the field. It states whichever of these the name and type do not already answer:

1. What the value represents.
2. Its units or range.
3. What null or empty means.
4. What is always true of it, which every writer must keep.

It says what the value is, never what code does with it. The test: a sentence that could become false through a change to the code that reads or writes the field, without the field's meaning changing, does not belong.

A fact about one member is stated at that member, not repeated in the comment of the class or type around it.
