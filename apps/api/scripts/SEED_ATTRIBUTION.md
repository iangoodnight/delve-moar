# SRD Seed Data — Attribution

All content seeded by `seed_srd.py` originates from the Dungeons & Dragons 5th
Edition Systems Reference Document and is used under open licenses. This file
documents the required attributions for both the content and the data
compilation.

---

## Content: Wizards of the Coast LLC

**Systems Reference Document 5.1** Copyright 2016, Wizards of the Coast LLC.
Licensed under
[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

> This work includes material taken from the System Reference Document 5.1 ("SRD
> 5.1") by Wizards of the Coast LLC, available at
> <https://dnd.wizards.com/resources/systems-reference-document>. The SRD 5.1 is
> licensed under the Creative Commons Attribution 4.0 International License,
> available at <https://creativecommons.org/licenses/by/4.0/legalcode>.

---

## Data Compilation: 5e-bits/5e-database

The structured JSON used to seed this database was fetched from the public API
at **dnd5eapi.co**, maintained by the [5e-bits](https://github.com/5e-bits)
team. Their compilation work — parsing, structuring, and hosting the SRD data —
represents a significant community contribution.

- Repository: <https://github.com/5e-bits/5e-database>
- API: <https://www.dnd5eapi.co>
- License: MIT (code) / CC BY 4.0 (data — inherits from SRD 5.1)

**Please consider supporting the 5e-bits project** if you find their work
valuable. The compiled data is used here with gratitude and full attribution.

---

## How attribution surfaces in this application

Every SRD row in the database carries a `content_source` JSONB column:

```json
{
  "type": "srd",
  "license": "CC BY 4.0",
  "license_url": "https://creativecommons.org/licenses/by/4.0/",
  "attribution": "Wizards of the Coast LLC — Systems Reference Document 5.1",
  "data_provider": "5e-bits/5e-database",
  "data_provider_url": "https://github.com/5e-bits/5e-database"
}
```

The web application renders an attribution footer on every SRD content detail
page, linking to both the CC BY 4.0 license and the 5e-bits repository.
