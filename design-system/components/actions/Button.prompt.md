Text button for any action; one primary (ink) or accent (terracotta) button per screen at most.
```jsx
<Button variant="accent" icon="check">Marquer comme visité</Button>
<Button variant="secondary" size="sm" icon="plus">Ajouter une ville</Button>
```
- variant: primary (ink, default) · accent (terracotta, only for "visité") · secondary (outline) · ghost
- size: md 44px (default, mobile hit target) · sm 36px
- icon / iconRight take Lucide names; fullWidth for sheet footers
