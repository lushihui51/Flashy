from __future__ import annotations

from typing import List


class Entry:
    infos: dict

    def __init__(self) -> None:
        self.infos = dict()


class Topic:
    fields: List[str]
    entries: List[Entry]

    def __init__(self) -> None:
        fields = []
        num_fields = int(input("Enter the number of fields: "))
        for i in range(num_fields):
            fields.append(input(f"Enter field {i + 1}: "))
        self.fields = fields
        self.entries = []

    def create_entry(self) -> None:
        entry = Entry()
        for field in self.fields:
            entry.infos[field] = input(f"Enter {field}: ")
        self.entries.append(entry)

    def test(self) -> None:
        s = set(self.entries)
        while s:
            entry = s.pop()
            asking_field = input(
                f"Choose a field to reveal from {' '.join(self.fields)}: "
            )
            answering_fields = self.fields.copy()
            answering_fields.remove(asking_field)
            input(
                f"What is the {', '.join(answering_fields)}, given {asking_field} is {entry.infos[asking_field]}"
            )

            print("Compare: \n")
            for answering_field in answering_fields:
                print(f"{answering_field}: {entry.infos[answering_field]}\n")


t = Topic()
for i in range(6):
    t.create_entry()
t.test()
