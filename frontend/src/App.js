import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [orderResult, setOrderResult] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/products`);
      const data = await response.json();
      setProducts(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        quantity: 1,
        product_name: product.name,
        product_price: product.price,
        product_image: product.image_url
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.product_id === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.product_price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  const categories = ['all', ...new Set(products.map(product => product.category))];

  const handleCheckout = async (customerData) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_phone: customerData.phone
        })
      });

      if (response.ok) {
        const result = await response.json();
        setOrderResult(result);
        setCart([]);
        setShowCheckout(false);
        setShowCart(false);
      } else {
        alert('Erreur lors de la création de la commande');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Chargement des produits...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <h1 className="logo">🛒 TechStore</h1>
          <nav className="nav">
            <button 
              className="cart-button"
              onClick={() => setShowCart(true)}
            >
              🛒 Panier ({getCartItemCount()})
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h2>Électronique & Services Numériques</h2>
          <p>Découvrez notre sélection de produits high-tech de qualité</p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="category-filter">
        <div className="container">
          <h3>Catégories</h3>
          <div className="category-buttons">
            {categories.map(category => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'Tous' : 
                 category === 'smartphones' ? 'Smartphones' :
                 category === 'laptops' ? 'Ordinateurs' :
                 category === 'audio' ? 'Audio' :
                 category === 'electronics' ? 'Électronique' : category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="products">
        <div className="container">
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x200?text=Image+Non+Disponible';
                  }}
                />
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="description">{product.description}</p>
                  <div className="price-section">
                    <span className="price">{product.price.toFixed(2)}€</span>
                    <span className="stock">Stock: {product.stock}</span>
                  </div>
                  <button 
                    className="add-to-cart-btn"
                    onClick={() => addToCart(product)}
                  >
                    Ajouter au panier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cart Modal */}
      {showCart && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Votre Panier</h2>
              <button onClick={() => setShowCart(false)}>✕</button>
            </div>
            <div className="modal-content">
              {cart.length === 0 ? (
                <p>Votre panier est vide</p>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.product_id} className="cart-item">
                      <img src={item.product_image} alt={item.product_name} />
                      <div className="item-details">
                        <h4>{item.product_name}</h4>
                        <p>{item.product_price}€</p>
                      </div>
                      <div className="quantity-controls">
                        <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>+</button>
                      </div>
                      <button 
                        className="remove-btn"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <div className="cart-total">
                    <strong>Total: {getTotalPrice().toFixed(2)}€</strong>
                  </div>
                  <button 
                    className="checkout-btn"
                    onClick={() => {
                      setShowCart(false);
                      setShowCheckout(true);
                    }}
                  >
                    Procéder au paiement
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal 
          cart={cart}
          total={getTotalPrice()}
          onSubmit={handleCheckout}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {/* Order Result Modal */}
      {orderResult && (
        <OrderResultModal 
          orderResult={orderResult}
          onClose={() => setOrderResult(null)}
        />
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 TechStore. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

// Checkout Modal Component
const CheckoutModal = ({ cart, total, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.phone) {
      onSubmit(formData);
    } else {
      alert('Veuillez remplir tous les champs');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal checkout-modal">
        <div className="modal-header">
          <h2>Finaliser la commande</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-content">
          <div className="order-summary">
            <h3>Résumé de la commande</h3>
            {cart.map(item => (
              <div key={item.product_id} className="summary-item">
                <span>{item.product_name} x{item.quantity}</span>
                <span>{(item.product_price * item.quantity).toFixed(2)}€</span>
              </div>
            ))}
            <div className="summary-total">
              <strong>Total: {total.toFixed(2)}€</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="checkout-form">
            <h3>Informations client</h3>
            <input
              type="text"
              placeholder="Nom complet"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
            <input
              type="tel"
              placeholder="Téléphone"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required
            />
            <button type="submit" className="submit-order-btn">
              Créer la commande
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Order Result Modal Component
const OrderResultModal = ({ orderResult, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal order-result-modal">
        <div className="modal-header">
          <h2>✅ Commande créée avec succès!</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-content">
          <div className="order-info">
            <p><strong>Numéro de commande:</strong> {orderResult.order_id}</p>
            <p><strong>Montant total:</strong> {orderResult.total.toFixed(2)}€</p>
            <p><strong>Statut:</strong> En attente de paiement</p>
          </div>
          
          <div className="payment-section">
            <h3>💳 Paiement par QR Code</h3>
            <p>Scannez le QR code ci-dessous pour effectuer le paiement:</p>
            
            <div className="qr-code-container">
              <img 
                src={orderResult.qr_code} 
                alt="QR Code de paiement"
                className="qr-code"
              />
            </div>
            
            <div className="payment-instructions">
              <h4>Instructions:</h4>
              <ol>
                <li>Ouvrez votre application de paiement mobile</li>
                <li>Scannez le QR code ci-dessus</li>
                <li>Vérifiez le montant: <strong>{orderResult.total.toFixed(2)}€</strong></li>
                <li>Confirmez le paiement vers le numéro: <strong>{orderResult.payment_phone}</strong></li>
              </ol>
            </div>
          </div>

          <button className="close-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;