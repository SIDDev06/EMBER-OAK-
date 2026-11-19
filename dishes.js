/* ============================================================
   dishes.js  -  THE ONE PLACE THAT DESCRIBES EVERY DISH
   ------------------------------------------------------------
   The scroll journey, the full menu and the order popup are all
   built from this list. To change a name, price, description,
   image or colour, change it HERE and nothing else.

   image   = your transparent front-view cut-out (PNG).
             Put the file in the folder:  images/dishes/
             Until that file exists, the site automatically shows
             the "standIn" photo instead, so nothing ever breaks.
   word    = the giant word shown BEHIND the dish.
   mood    = bg   -> the dark background colour of that scene
             glow -> the colour of the fire-light behind the dish
   ============================================================ */
window.DISHES = [
  {
    id: 'tomahawk', word: 'TOMAHAWK', tag: "Chef's Signature",
    name: 'The Ember Tomahawk', price: 48,
    desc: 'Our legendary 800g tomahawk, dry-aged for 30 days and cooked over oak fire. Served with roasted vegetables and red wine sauce.',
    image: 'images/dishes/tomahawk.png',
    standIn: 'https://images.unsplash.com/photo-1558030006-450675393462?w=900&q=80',
    mood: { bg: '#1b0907', glow: '#ff5a1f' }
  },
  {
    id: 'steak', word: 'STEAK', tag: 'From the Fire',
    name: 'Signature Steak', price: 24,
    desc: 'Flame-grilled ribeye with garlic butter and herbs.',
    image: 'images/dishes/steak.png',
    standIn: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=900&q=80',
    mood: { bg: '#1c0b09', glow: '#e0381f' }
  },
  {
    id: 'skewers', word: 'SKEWERS', tag: 'From the Fire',
    name: 'Oak Grilled Skewers', price: 19,
    desc: 'Marinated chicken and peppers charred over open oak fire.',
    image: 'images/dishes/skewers.png',
    standIn: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&q=80',
    mood: { bg: '#1a1006', glow: '#ff8c1a' }
  },
  {
    id: 'salmon', word: 'SALMON', tag: 'From the Sea',
    name: 'Grilled Salmon', price: 22,
    desc: 'Atlantic salmon with lemon, asparagus and herbs.',
    image: 'images/dishes/salmon.png',
    standIn: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&q=80',
    mood: { bg: '#06161b', glow: '#3fb6c4' }
  },
  {
    id: 'pasta', word: 'PASTA', tag: 'Fresh Made Daily',
    name: 'Truffle Pasta', price: 18,
    desc: 'Fresh tagliatelle in a creamy black truffle sauce.',
    image: 'images/dishes/pasta.png',
    standIn: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&q=80',
    mood: { bg: '#1e170b', glow: '#f0c27a' }
  },
  {
    id: 'risotto', word: 'RISOTTO', tag: 'Fresh Made Daily',
    name: 'Creamy Risotto', price: 17,
    desc: 'Slow-cooked arborio rice with mushrooms and parmesan.',
    image: 'images/dishes/risotto.png',
    standIn: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&q=80',
    mood: { bg: '#17160b', glow: '#c9b36a' }
  },
  {
    id: 'pizza', word: 'PIZZA', tag: 'Wood-Fired',
    name: 'Wood-Fired Pizza', price: 14,
    desc: 'Stone-baked margherita with buffalo mozzarella and basil.',
    image: 'images/dishes/pizza.png',
    standIn: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80',
    mood: { bg: '#200f06', glow: '#ff6a2b' }
  },
  {
    id: 'burger', word: 'BURGER', tag: 'House Favourite',
    name: 'Gourmet Burger', price: 15,
    desc: 'Juicy beef patty, aged cheddar and house sauce.',
    image: 'images/dishes/burger.png',
    standIn: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=80',
    mood: { bg: '#1a0f08', glow: '#e8a13a' }
  },
  {
    id: 'harvest', word: 'HARVEST', tag: 'Fresh & Green',
    name: 'Harvest Bowl', price: 16,
    desc: 'Roasted vegetables, quinoa, avocado and tahini dressing.',
    image: 'images/dishes/harvest.png',
    standIn: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80',
    mood: { bg: '#0b170c', glow: '#7fc45a' }
  },
  {
    id: 'dessert', word: 'DESSERT', tag: 'Something Sweet',
    name: 'Chocolate Dessert', price: 9,
    desc: 'Warm chocolate fondant with vanilla ice cream.',
    image: 'images/dishes/dessert.png',
    standIn: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&q=80',
    mood: { bg: '#170d0a', glow: '#b5683f' }
  }
];