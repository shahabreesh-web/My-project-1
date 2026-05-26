import { useState, useEffect } from 'react';
import { db, auth, storage } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup 
} from "firebase/auth";
import { collection, addDoc, onSnapshot, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Plus, ShoppingCart, Upload, UserCheck, DollarSign, Users, Package, Check, X } from 'lucide-react';

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('login');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Product Form
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: 50, category: 'গ্রোসারি' });
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const PLATFORM_COMMISSION = 0.08;

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) setPage('dashboard');
    });
  }, []);

  useEffect(() => {
    onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    if (user) {
      onSnapshot(collection(db, "orders"), (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      onSnapshot(collection(db, "users"), (snap) => {
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [user]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ==================== AUTH ====================
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast("🎉 Google লগইন সফল!");
    } catch (err) { setError("Google লগইন ব্যর্থ"); }
  };

  const handleGithubSignIn = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
      showToast("🎉 GitHub লগইন সফল!");
    } catch (err) { setError("GitHub লগইন ব্যর্থ"); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await addDoc(collection(db, "users"), {
        uid: res.user.uid,
        name,
        email,
        role: "vendor",
        status: "pending",
        createdAt: serverTimestamp()
      });
      showToast("✅ রেজিস্ট্রেশন সফল! অ্যাডমিন অ্যাপ্রুভ করবে।");
    } catch (err) { setError(err.message); }
  };

  // ==================== ADMIN FUNCTIONS ====================
  const approveVendor = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), { status: "approved" });
      showToast("✅ Vendor Approved");
    } catch (err) { console.error(err); }
  };

  // ==================== PRODUCT ====================
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    try {
      await addDoc(collection(db, "products"), {
        ...newProduct,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        vendorId: auth.currentUser.uid,
        vendorName: user.email,
        createdAt: serverTimestamp()
      });
      setNewProduct({ name: '', price: '', stock: 50, category: 'গ্রোসারি' });
      setProductImage(null);
      setImagePreview(null);
      showToast("✅ প্রোডাক্ট যোগ হয়েছে");
    } catch (err) { console.error(err); }
  };

  // ==================== ORDER + COMMISSION ====================
  const checkout = () => {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const commission = Math.round(total * PLATFORM_COMMISSION);
    setSelectedPayment({ total, commission, cart });
  };

  const processPayment = async (method) => {
    const total = selectedPayment.total;
    const commission = selectedPayment.commission;

    await addDoc(collection(db, "orders"), {
      customerId: auth.currentUser.uid,
      items: selectedPayment.cart,
      total,
      commission,
      sellerAmount: total - commission,
      paymentMethod: method,
      status: "পেইড",
      date: serverTimestamp()
    });

    showToast(`✅ ${method} পেমেন্ট সফল! কমিশন: ৳ ${commission}`);
    setCart([]);
    setSelectedPayment(null);
  };

  const handleLogout = () => signOut(auth);

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-2xl">লোডিং...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex items-center justify-center p-4">
        <div className="bg-gray-900 p-10 rounded-3xl w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <span className="text-6xl">🐝👁️</span>
            <h1 className="text-4xl font-bold mt-4">Bee Eye</h1>
            <p className="text-emerald-400">ব্যবসার স্মার্ট প্ল্যাটফর্ম</p>
          </div>

          <button onClick={handleGoogleSignIn} className="w-full bg-white text-black py-4 rounded-2xl font-bold mb-3">Google দিয়ে লগইন</button>
          <button onClick={handleGithubSignIn} className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold mb-6">🐙 GitHub দিয়ে লগইন</button>

          <form onSubmit={handleRegister}>
            <input type="text" placeholder="নাম" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-gray-800 rounded-2xl mb-4" required />
            <input type="email" placeholder="ইমেইল" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-gray-800 rounded-2xl mb-4" required />
            <input type="password" placeholder="পাসওয়ার্ড" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-800 rounded-2xl mb-6" required />
            <button type="submit" className="w-full bg-emerald-500 text-black py-4 rounded-2xl font-bold">Vendor হিসেবে রেজিস্টার করুন</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-black p-4 sticky top-0 z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🐝👁️</span>
            <h1 className="text-3xl font-bold">Bee Eye</h1>
          </div>
          <button onClick={handleLogout} className="text-red-400">লগআউট</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold mb-2">স্বাগতম, {user.email.split('@')[0]}!</h1>

        <div className="flex gap-4 mt-8 flex-wrap">
          <button onClick={() => setPage('dashboard')} className={`px-6 py-3 rounded-2xl ${page === 'dashboard' ? 'bg-emerald-500 text-black' : 'bg-gray-900'}`}>ড্যাশবোর্ড</button>
          <button onClick={() => setPage('products')} className={`px-6 py-3 rounded-2xl ${page === 'products' ? 'bg-emerald-500 text-black' : 'bg-gray-900'}`}>প্রোডাক্ট যোগ</button>
          <button onClick={() => setPage('marketplace')} className={`px-6 py-3 rounded-2xl ${page === 'marketplace' ? 'bg-emerald-500 text-black' : 'bg-gray-900'}`}>মার্কেটপ্লেস</button>
          <button onClick={() => setPage('orders')} className={`px-6 py-3 rounded-2xl ${page === 'orders' ? 'bg-emerald-500 text-black' : 'bg-gray-900'}`}>অর্ডারসমূহ</button>
          <button onClick={() => setPage('admin')} className={`px-6 py-3 rounded-2xl ${page === 'admin' ? 'bg-emerald-500 text-black' : 'bg-gray-900'}`}>Admin Dashboard</button>
        </div>

        {/* Dashboard */}
        {page === 'dashboard' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 p-8 rounded-3xl">
              <h3 className="text-emerald-400">মোট প্রোডাক্ট</h3>
              <p className="text-5xl font-bold mt-4">{products.length}</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-3xl">
              <h3 className="text-emerald-400">মোট অর্ডার</h3>
              <p className="text-5xl font-bold mt-4">{orders.length}</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-3xl">
              <h3 className="text-emerald-400">কমিশন রেট</h3>
              <p className="text-5xl font-bold mt-4 text-green-400">৮%</p>
            </div>
          </div>
        )}

        {/* Products Page */}
        {page === 'products' && (
          <div className="mt-8 bg-gray-900 p-8 rounded-3xl">
            <h2 className="text-2xl font-bold mb-6">নতুন প্রোডাক্ট যোগ করুন</h2>
            <input type="text" placeholder="প্রোডাক্ট নাম" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-4 bg-gray-800 rounded-2xl mb-4" />
            <input type="number" placeholder="দাম" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-4 bg-gray-800 rounded-2xl mb-4" />
            <input type="file" accept="image/*" onChange={handleImageChange} className="mb-6" />
            {imagePreview && <img src={imagePreview} className="w-48 h-48 object-cover rounded-2xl mb-4" />}
            <button onClick={handleAddProduct} className="bg-emerald-500 px-10 py-4 rounded-2xl font-bold flex items-center gap-2">
              <Plus /> যোগ করুন
            </button>
          </div>
        )}

        {/* Marketplace */}
        {page === 'marketplace' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {products.map(p => (
              <div key={p.id} className="bg-gray-900 p-6 rounded-3xl">
                <h3 className="font-bold">{p.name}</h3>
                <p className="text-3xl font-bold text-emerald-400">৳ {p.price}</p>
                <button onClick={() => addToCart(p)} className="mt-6 w-full bg-emerald-500 text-black py-4 rounded-2xl font-bold">কার্টে যোগ করুন</button>
              </div>
            ))}
          </div>
        )}

        {/* Orders */}
        {page === 'orders' && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6">অর্ডার ও কমিশন</h2>
            {orders.map(order => (
              <div key={order.id} className="bg-gray-900 p-6 rounded-3xl mb-4">
                <p>মোট: ৳ {order.total}</p>
                <p className="text-emerald-400">কমিশন: ৳ {order.commission}</p>
                <p className="text-green-400">ভেন্ডর পাবে: ৳ {order.sellerAmount}</p>
                <p>স্ট্যাটাস: {order.status}</p>
              </div>
            ))}
          </div>
        )}

        {/* Admin Dashboard */}
        {page === 'admin' && (
          <div className="mt-8">
            <h2 className="text-3xl font-bold mb-6">Admin Dashboard</h2>
            
            <div className="bg-gray-900 p-8 rounded-3xl mb-8">
              <h3 className="text-xl font-bold mb-4">Vendor List (Approval)</h3>
              {allUsers.map(u => (
                <div key={u.id} className="flex justify-between items-center bg-gray-800 p-4 rounded-2xl mb-3">
                  <div>
                    <p>{u.name} ({u.email})</p>
                    <p className="text-sm text-gray-400">Status: {u.status}</p>
                  </div>
                  {u.status === "pending" && (
                    <button onClick={() => approveVendor(u.id)} className="bg-green-600 px-6 py-2 rounded-xl">Approve</button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-gray-900 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-4">All Orders</h3>
              {orders.map(order => (
                <div key={order.id} className="bg-gray-800 p-6 rounded-2xl mb-4">
                  <p>মোট: ৳ {order.total}</p>
                  <p>কমিশন: ৳ {order.commission}</p>
                  <p>ভেন্ডর পাবে: ৳ {order.sellerAmount}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Cart */}
      {cart.length > 0 && (
        <div onClick={checkout} className="fixed bottom-8 right-8 bg-emerald-500 text-black px-8 py-4 rounded-3xl shadow-2xl cursor-pointer font-bold flex items-center gap-3 z-50">
          <ShoppingCart /> চেকআউট (৳ {cart.reduce((a,b) => a + b.price, 0)})
        </div>
      )}

      <AnimatePresence>
        {toast && <motion.div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 px-10 py-4 rounded-2xl z-50">{toast}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

export default App;
