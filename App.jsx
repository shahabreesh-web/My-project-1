import { useEffect, useMemo, useState } from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  limit,
  orderBy,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { motion, AnimatePresence } from "framer-motion";

import {
  ShoppingCart,
  Plus,
  Trash2,
  Pencil,
  LogOut,
  Search,
  Package,
} from "lucide-react";

import { db, auth, storage } from "./firebase";

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

const PLATFORM_COMMISSION = 0.08;
const ITEMS_PER_PAGE = 6;

function App() {

  // =========================
  // AUTH
  // =========================

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  // =========================
  // UI
  // =========================

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const [page, setPage] = useState("dashboard");

  // =========================
  // DATA
  // =========================

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // =========================
  // SEARCH + FILTER
  // =========================

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // =========================
  // PAGINATION
  // =========================

  const [currentPage, setCurrentPage] = useState(1);

  // =========================
  // CART
  // =========================

  const [cart, setCart] = useState([]);

  // =========================
  // LOGIN / REGISTER
  // =========================

  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // =========================
  // PRODUCT FORM
  // =========================

  const [editingProductId, setEditingProductId] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    stock: 50,
    category: "গ্রোসারি",
  });

  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // =========================
  // TOAST
  // =========================

  const showToast = (msg) => {
    setToast(msg);

    setTimeout(() => {
      setToast("");
    }, 3000);
  };

  // =========================
  // AUTH LISTENER
  // =========================

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, (u) => {

      setUser(u);

      if (!u) {
        setUserData(null);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "users"),
        where("uid", "==", u.uid),
        limit(1)
      );

      const unsubUser = onSnapshot(q, (snap) => {

        if (!snap.empty) {
          setUserData({
            id: snap.docs[0].id,
            ...snap.docs[0].data(),
          });
        }

        setLoading(false);
      });

      return () => unsubUser();
    });

    return () => unsub();

  }, []);

  // =========================
  // PRODUCTS
  // =========================

  useEffect(() => {

    const q = query(
      collection(db, "products"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {

      setProducts(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );

    });

    return () => unsub();

  }, []);

  // =========================
  // ORDERS
  // =========================

  useEffect(() => {

    if (!user) return;

    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {

      setOrders(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );

    });

    return () => unsub();

  }, [user]);

  // =========================
  // ADMIN USERS
  // =========================

  useEffect(() => {

    if (userData?.role !== "admin") return;

    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {

        setAllUsers(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );

      }
    );

    return () => unsub();

  }, [userData]);

  // =========================
  // FILTERED PRODUCTS
  // =========================

  const filteredProducts = useMemo(() => {

    return products.filter((p) => {

      const matchSearch =
        p.name
          ?.toLowerCase()
          ?.includes(search.toLowerCase());

      const matchCategory =
        selectedCategory === "all"
          ? true
          : p.category === selectedCategory;

      return matchSearch && matchCategory;

    });

  }, [products, search, selectedCategory]);

  // =========================
  // PAGINATION
  // =========================

  const paginatedProducts = useMemo(() => {

    const start =
      (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredProducts.slice(
      start,
      start + ITEMS_PER_PAGE
    );

  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(
    filteredProducts.length / ITEMS_PER_PAGE
  );

  // =========================
  // AUTH FUNCTIONS
  // =========================

  const handleRegister = async (e) => {

    e.preventDefault();

    try {

      setSubmitting(true);
      setError("");

      const res =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await addDoc(collection(db, "users"), {
        uid: res.user.uid,
        name,
        email,
        role: "vendor",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      showToast("✅ Registration Success");

    } catch (err) {

      setError(err.message);

    } finally {

      setSubmitting(false);

    }
  };

  const handleLogin = async (e) => {

    e.preventDefault();

    try {

      setSubmitting(true);

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      showToast("✅ Login Success");

    } catch (err) {

      setError(err.message);

    } finally {

      setSubmitting(false);

    }
  };

  const handleGoogleLogin = async () => {

    try {

      await signInWithPopup(
        auth,
        googleProvider
      );

      showToast("✅ Google Login");

    } catch (err) {

      setError(err.message);

    }
  };

  const handleGithubLogin = async () => {

    try {

      await signInWithPopup(
        auth,
        githubProvider
      );

      showToast("✅ Github Login");

    } catch (err) {

      setError(err.message);

    }
  };

  const handleResetPassword = async () => {

    if (!email) {
      return setError("ইমেইল দিন");
    }

    try {

      await sendPasswordResetEmail(
        auth,
        email
      );

      showToast("📩 Reset Email Sent");

    } catch (err) {

      setError(err.message);

    }
  };

  const handleLogout = async () => {

    await signOut(auth);

  };
  // =========================
  // IMAGE CHANGE
  // =========================

  const handleImageChange = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    setProductImage(file);

    setImagePreview(
      URL.createObjectURL(file)
    );
  };

  // =========================
  // ADD / UPDATE PRODUCT
  // =========================

  const handleAddOrUpdateProduct = async () => {

    if (
      !newProduct.name ||
      !newProduct.price
    ) {
      return setError("সব তথ্য দিন");
    }

    if (
      userData?.status !== "approved"
    ) {
      return setError(
        "Admin approval প্রয়োজন"
      );
    }

    try {

      setSubmitting(true);
      setError("");

      let imageUrl = "";

      // =====================
      // IMAGE UPLOAD
      // =====================

      if (productImage) {

        const imageRef = ref(
          storage,
          `products/${Date.now()}-${productImage.name}`
        );

        await uploadBytes(
          imageRef,
          productImage
        );

        imageUrl =
          await getDownloadURL(imageRef);
      }

      // =====================
      // UPDATE PRODUCT
      // =====================

      if (editingProductId) {

        const updateData = {
          ...newProduct,
          price: Number(newProduct.price),
          stock: Number(newProduct.stock),
          updatedAt: serverTimestamp(),
        };

        if (imageUrl) {
          updateData.imageUrl = imageUrl;
        }

        await updateDoc(
          doc(
            db,
            "products",
            editingProductId
          ),
          updateData
        );

        showToast(
          "✅ Product Updated"
        );

      } else {

        // =====================
        // ADD PRODUCT
        // =====================

        await addDoc(
          collection(db, "products"),
          {
            ...newProduct,
            imageUrl,
            price: Number(
              newProduct.price
            ),
            stock: Number(
              newProduct.stock
            ),
            vendorId: user.uid,
            vendorName: user.email,
            createdAt:
              serverTimestamp(),
          }
        );

        showToast(
          "✅ Product Added"
        );
      }

      // =====================
      // RESET FORM
      // =====================

      setEditingProductId(null);

      setNewProduct({
        name: "",
        price: "",
        stock: 50,
        category: "গ্রোসারি",
      });

      setProductImage(null);
      setImagePreview(null);

    } catch (err) {

      setError(err.message);

    } finally {

      setSubmitting(false);

    }
  };

  // =========================
  // EDIT PRODUCT
  // =========================

  const editProduct = (product) => {

    setEditingProductId(product.id);

    setNewProduct({
      name: product.name,
      price: product.price,
      stock: product.stock,
      category: product.category,
    });

    setImagePreview(
      product.imageUrl
    );

    setPage("products");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // DELETE PRODUCT
  // =========================

  const deleteProduct = async (
    product
  ) => {

    try {

      if (
        !window.confirm(
          "Delete Product?"
        )
      ) {
        return;
      }

      // =====================
      // DELETE IMAGE
      // =====================

      if (product.imageUrl) {

        try {

          const imageRef = ref(
            storage,
            product.imageUrl
          );

          await deleteObject(
            imageRef
          );

        } catch {
          console.log(
            "Image delete skipped"
          );
        }
      }

      // =====================
      // DELETE DOC
      // =====================

      await deleteDoc(
        doc(
          db,
          "products",
          product.id
        )
      );

      showToast(
        "🗑️ Product Deleted"
      );

    } catch (err) {

      setError(err.message);

    }
  };

  // =========================
  // ADD TO CART
  // =========================

  const addToCart = (product) => {

    if (product.stock <= 0) {
      return showToast(
        "❌ Out of Stock"
      );
    }

    const exists = cart.find(
      (item) => item.id === product.id
    );

    if (exists) {

      const updatedCart = cart.map(
        (item) => {

          if (
            item.id === product.id
          ) {

            if (
              item.quantity >=
              product.stock
            ) {
              return item;
            }

            return {
              ...item,
              quantity:
                item.quantity + 1,
            };
          }

          return item;
        }
      );

      setCart(updatedCart);

    } else {

      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
        },
      ]);
    }

    showToast(
      "🛒 Added To Cart"
    );
  };

  // =========================
  // CART QUANTITY
  // =========================

  const increaseQuantity = (
    productId
  ) => {

    const updatedCart = cart.map(
      (item) => {

        if (
          item.id === productId
        ) {

          if (
            item.quantity >=
            item.stock
          ) {
            return item;
          }

          return {
            ...item,
            quantity:
              item.quantity + 1,
          };
        }

        return item;
      }
    );

    setCart(updatedCart);
  };

  const decreaseQuantity = (
    productId
  ) => {

    const updatedCart = cart
      .map((item) => {

        if (
          item.id === productId
        ) {

          return {
            ...item,
            quantity:
              item.quantity - 1,
          };
        }

        return item;
      })
      .filter(
        (item) =>
          item.quantity > 0
      );

    setCart(updatedCart);
  };

  // =========================
  // CART TOTAL
  // =========================

  const cartTotal = cart.reduce(
    (sum, item) => {

      return (
        sum +
        item.price * item.quantity
      );

    },
    0
  );

  const commission = Number(
    (
      cartTotal *
      PLATFORM_COMMISSION
    ).toFixed(2)
  );

  // =========================
  // CHECKOUT
  // =========================

  const checkout = async () => {

    if (cart.length === 0) {
      return;
    }

    try {

      setSubmitting(true);

      // =====================
      // STOCK VALIDATION
      // =====================

      for (const item of cart) {

        const realProduct =
          products.find(
            (p) => p.id === item.id
          );

        if (
          !realProduct ||
          realProduct.stock <
            item.quantity
        ) {

          return setError(
            `${item.name} stock unavailable`
          );
        }
      }

      // =====================
      // CREATE ORDER
      // =====================

      await addDoc(
        collection(db, "orders"),
        {
          customerId: user.uid,
          customerEmail:
            user.email,
          items: cart,
          total: cartTotal,
          commission,
          sellerAmount:
            cartTotal - commission,
          status: "Paid",
          createdAt:
            serverTimestamp(),
        }
      );

      // =====================
      // INVENTORY UPDATE
      // =====================

      for (const item of cart) {

        const productRef = doc(
          db,
          "products",
          item.id
        );

        const realProduct =
          products.find(
            (p) => p.id === item.id
          );

        await updateDoc(
          productRef,
          {
            stock:
              realProduct.stock -
              item.quantity,
          }
        );
      }

      // =====================
      // CLEAR CART
      // =====================

      setCart([]);

      showToast(
        "✅ Order Successful"
      );

    } catch (err) {

      setError(err.message);

    } finally {

      setSubmitting(false);

    }
  };

  // =========================
  // APPROVE VENDOR
  // =========================

  const approveVendor = async (
    userId
  ) => {

    try {

      await updateDoc(
        doc(db, "users", userId),
        {
          status: "approved",
        }
      );

      showToast(
        "✅ Vendor Approved"
      );

    } catch (err) {

      setError(err.message);

    }
  };

  // =========================
  // FILTER ORDERS
  // =========================

  const myOrders = orders.filter(
    (o) =>
      o.customerId === user?.uid
  );

  const vendorOrders =
    orders.filter((order) => {

      return order.items.some(
        (item) =>
          item.vendorId === user?.uid
      );
    });

  // =========================
  // LOADING SCREEN
  // =========================

  if (loading) {

    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white text-4xl">
        Loading...
      </div>
    );
  };
  // =========================
  // AUTH PAGE
  // =========================

  if (!user) {

    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black text-white flex items-center justify-center p-5">

        <div className="w-full max-w-md bg-gray-900 p-10 rounded-3xl shadow-2xl">

          <h1 className="text-5xl font-black text-center mb-3">
            🐝 Bee Eye
          </h1>

          <p className="text-center text-gray-400 mb-8">
            Smart Business Platform
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-2xl mb-5">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold mb-3"
          >
            Continue with Google
          </button>

          <button
            onClick={handleGithubLogin}
            className="w-full bg-gray-800 py-4 rounded-2xl font-bold mb-6"
          >
            Continue with GitHub
          </button>

          <form
            onSubmit={
              isLogin
                ? handleLogin
                : handleRegister
            }
          >

            {!isLogin && (
              <input
                type="text"
                placeholder="আপনার নাম"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                className="w-full bg-gray-800 p-4 rounded-2xl mb-4 outline-none"
              />
            )}

            <input
              type="email"
              placeholder="ইমেইল"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full bg-gray-800 p-4 rounded-2xl mb-4 outline-none"
            />

            <input
              type="password"
              placeholder="পাসওয়ার্ড"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full bg-gray-800 p-4 rounded-2xl mb-6 outline-none"
            />

            <button
              disabled={submitting}
              className="w-full bg-emerald-500 text-black py-4 rounded-2xl font-black"
            >
              {submitting
                ? "Loading..."
                : isLogin
                ? "Login"
                : "Register"}
            </button>
          </form>

          <button
            onClick={
              handleResetPassword
            }
            className="mt-5 text-emerald-400"
          >
            Forgot Password?
          </button>

          <button
            onClick={() =>
              setIsLogin(!isLogin)
            }
            className="block w-full mt-5 text-center text-gray-300"
          >
            {isLogin
              ? "Create Account"
              : "Already have account?"}
          </button>

        </div>
      </div>
    );
  }

  // =========================
  // MAIN APP
  // =========================

  return (

    <div className="min-h-screen bg-gray-950 text-white">

      {/* NAVBAR */}

      <nav className="sticky top-0 z-50 bg-black border-b border-gray-800 p-5">

        <div className="max-w-7xl mx-auto flex justify-between items-center">

          <div>
            <h1 className="text-4xl font-black">
              🐝 Bee Eye
            </h1>

            <p className="text-gray-400 text-sm">
              Welcome {user.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="text-red-400 flex items-center gap-2"
          >
            <LogOut size={20} />
            Logout
          </button>

        </div>
      </nav>

      {/* MAIN CONTAINER */}

      <div className="max-w-7xl mx-auto p-6">

        {/* MENU */}

        <div className="flex gap-4 flex-wrap mb-8">

          <button
            onClick={() =>
              setPage("dashboard")
            }
            className="bg-gray-900 px-6 py-3 rounded-2xl"
          >
            Dashboard
          </button>

          <button
            onClick={() =>
              setPage("products")
            }
            className="bg-gray-900 px-6 py-3 rounded-2xl"
          >
            Products
          </button>

          <button
            onClick={() =>
              setPage("marketplace")
            }
            className="bg-gray-900 px-6 py-3 rounded-2xl"
          >
            Marketplace
          </button>

          <button
            onClick={() =>
              setPage("orders")
            }
            className="bg-gray-900 px-6 py-3 rounded-2xl"
          >
            Orders
          </button>

          {userData?.role ===
            "admin" && (
            <button
              onClick={() =>
                setPage("admin")
              }
              className="bg-emerald-600 px-6 py-3 rounded-2xl"
            >
              Admin
            </button>
          )}

        </div>

        {/* DASHBOARD */}

        {page === "dashboard" && (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="bg-gray-900 p-8 rounded-3xl">
              <Package className="mb-4" />
              <h3 className="text-gray-400">
                Total Products
              </h3>
              <p className="text-5xl font-black mt-3">
                {products.length}
              </p>
            </div>

            <div className="bg-gray-900 p-8 rounded-3xl">
              <ShoppingCart className="mb-4" />
              <h3 className="text-gray-400">
                Orders
              </h3>
              <p className="text-5xl font-black mt-3">
                {orders.length}
              </p>
            </div>

            <div className="bg-gray-900 p-8 rounded-3xl">
              <h3 className="text-gray-400">
                Commission
              </h3>
              <p className="text-5xl font-black mt-3 text-emerald-400">
                8%
              </p>
            </div>

            <div className="bg-gray-900 p-8 rounded-3xl">
              <h3 className="text-gray-400">
                Cart Items
              </h3>
              <p className="text-5xl font-black mt-3">
                {cart.length}
              </p>
            </div>

          </div>
        )}

        {/* PRODUCT PAGE */}

        {page === "products" && (

          <div className="bg-gray-900 p-8 rounded-3xl">

            <h2 className="text-3xl font-black mb-6">
              {
                editingProductId
                  ? "Update Product"
                  : "Add Product"
              }
            </h2>

            <input
              type="text"
              placeholder="Product Name"
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  name: e.target.value,
                })
              }
              className="w-full bg-gray-800 p-4 rounded-2xl mb-4"
            />

            <input
              type="number"
              placeholder="Price"
              value={newProduct.price}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  price: e.target.value,
                })
              }
              className="w-full bg-gray-800 p-4 rounded-2xl mb-4"
            />

            <input
              type="number"
              placeholder="Stock"
              value={newProduct.stock}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  stock: e.target.value,
                })
              }
              className="w-full bg-gray-800 p-4 rounded-2xl mb-4"
            />

            <select
              value={newProduct.category}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  category: e.target.value,
                })
              }
              className="w-full bg-gray-800 p-4 rounded-2xl mb-4"
            >
              <option>
                গ্রোসারি
              </option>

              <option>
                ফ্যাশন
              </option>

              <option>
                ইলেকট্রনিক্স
              </option>

            </select>

            <input
              type="file"
              accept="image/*"
              onChange={
                handleImageChange
              }
              className="mb-5"
            />

            {imagePreview && (
              <img
                src={imagePreview}
                alt=""
                className="w-48 h-48 object-cover rounded-3xl mb-5"
              />
            )}

            <button
              disabled={submitting}
              onClick={
                handleAddOrUpdateProduct
              }
              className="bg-emerald-500 text-black px-10 py-4 rounded-2xl font-black flex items-center gap-3"
            >
              <Plus />
              {
                editingProductId
                  ? "Update"
                  : "Add Product"
              }
            </button>

          </div>
        )}

        {/* MARKETPLACE */}

        {page === "marketplace" && (

          <>
            {/* SEARCH */}

            <div className="flex flex-col sm:flex-row gap-4 mb-8">

              <div className="flex-1 relative">

                <Search
                  className="absolute left-4 top-4 text-gray-500"
                  size={20}
                />

                <input
                  type="text"
                  placeholder="Search Products..."
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  className="w-full bg-gray-900 p-4 pl-12 rounded-2xl"
                />
              </div>

              <select
                value={
                  selectedCategory
                }
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value
                  )
                }
                className="bg-gray-900 p-4 rounded-2xl"
              >
                <option value="all">
                  All
                </option>

                <option value="গ্রোসারি">
                  গ্রোসারি
                </option>

                <option value="ফ্যাশন">
                  ফ্যাশন
                </option>

                <option value="ইলেকট্রনিক্স">
                  ইলেকট্রনিক্স
                </option>
              </select>

            </div>

            {/* PRODUCT GRID */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {paginatedProducts.map(
                (p) => (

                  <div
                    key={p.id}
                    className="bg-gray-900 p-5 rounded-3xl"
                  >

                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-60 object-cover rounded-3xl mb-5"
                      />
                    )}

                    <h2 className="text-2xl font-black">
                      {p.name}
                    </h2>

                    <p className="text-gray-400 mt-2">
                      {p.category}
                    </p>

                    <p className="text-4xl font-black text-emerald-400 mt-4">
                      ৳ {p.price}
                    </p>

                    <p className="mt-2">
                      Stock: {p.stock}
                    </p>

                    <button
                      onClick={() =>
                        addToCart(p)
                      }
                      className="w-full bg-emerald-500 text-black py-4 rounded-2xl mt-6 font-black"
                    >
                      Add To Cart
                    </button>

                    {p.vendorId ===
                      user.uid && (
                      <div className="flex gap-3 mt-4">

                        <button
                          onClick={() =>
                            editProduct(p)
                          }
                          className="flex-1 bg-blue-600 py-3 rounded-2xl flex items-center justify-center gap-2"
                        >
                          <Pencil size={18} />
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            deleteProduct(
                              p
                            )
                          }
                          className="flex-1 bg-red-600 py-3 rounded-2xl flex items-center justify-center gap-2"
                        >
                          <Trash2 size={18} />
                          Delete
                        </button>

                      </div>
                    )}

                  </div>
                )
              )}
            </div>
            {/* PAGINATION */}

            <div className="flex justify-center gap-3 mt-10 flex-wrap">

              {Array.from(
                { length: totalPages },
                (_, i) => i + 1
              ).map((num) => (

                <button
                  key={num}
                  onClick={() =>
                    setCurrentPage(num)
                  }
                  className={`px-5 py-3 rounded-2xl font-bold ${
                    currentPage === num
                      ? "bg-emerald-500 text-black"
                      : "bg-gray-800"
                  }`}
                >
                  {num}
                </button>

              ))}

            </div>

          </>
        )}

        {/* ORDERS */}

        {page === "orders" && (

          <div>

            <h2 className="text-4xl font-black mb-8">
              My Orders
            </h2>

            <div className="space-y-5">

              {myOrders.map((order) => (

                <div
                  key={order.id}
                  className="bg-gray-900 p-6 rounded-3xl"
                >

                  <div className="flex justify-between items-center flex-wrap gap-4">

                    <div>
                      <p className="text-2xl font-black">
                        ৳ {order.total}
                      </p>

                      <p className="text-gray-400 mt-2">
                        Status: {order.status}
                      </p>

                      <p className="text-emerald-400 mt-2">
                        Commission:
                        ৳ {order.commission}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-gray-400">
                        Seller Gets
                      </p>

                      <p className="text-green-400 text-2xl font-black">
                        ৳ {order.sellerAmount}
                      </p>
                    </div>

                  </div>

                </div>

              ))}

            </div>

            {/* VENDOR ORDERS */}

            <h2 className="text-4xl font-black mt-16 mb-8">
              Vendor Orders
            </h2>

            <div className="space-y-5">

              {vendorOrders.map((order) => (

                <div
                  key={order.id}
                  className="bg-gray-900 p-6 rounded-3xl"
                >

                  <p className="text-xl font-bold">
                    Customer:
                    {order.customerEmail}
                  </p>

                  <p className="mt-3">
                    Total: ৳ {order.total}
                  </p>

                  <p className="text-emerald-400 mt-2">
                    Commission:
                    ৳ {order.commission}
                  </p>

                </div>

              ))}

            </div>

          </div>
        )}

        {/* ADMIN */}

        {page === "admin" &&
          userData?.role ===
            "admin" && (

          <div className="space-y-8">

            <div className="bg-gray-900 p-8 rounded-3xl">

              <h2 className="text-4xl font-black mb-8">
                Vendor Approval
              </h2>

              <div className="space-y-5">

                {allUsers.map((u) => (

                  <div
                    key={u.id}
                    className="bg-gray-800 p-5 rounded-3xl flex justify-between items-center flex-wrap gap-5"
                  >

                    <div>
                      <h3 className="text-xl font-bold">
                        {u.name}
                      </h3>

                      <p className="text-gray-400 mt-2">
                        {u.email}
                      </p>

                      <p className="mt-2">
                        Role: {u.role}
                      </p>

                      <p className="mt-2">
                        Status:
                        {u.status}
                      </p>
                    </div>

                    {u.status ===
                      "pending" && (

                      <button
                        onClick={() =>
                          approveVendor(
                            u.id
                          )
                        }
                        className="bg-green-600 px-8 py-4 rounded-2xl font-bold"
                      >
                        Approve
                      </button>

                    )}

                  </div>

                ))}

              </div>

            </div>
          </div>
        )}

      </div>

      {/* FLOATING CART */}

      {cart.length > 0 && (

        <div className="fixed bottom-8 right-8 z-50">

          <div className="bg-gray-900 p-5 rounded-3xl shadow-2xl w-96 max-w-[95vw]">

            <h2 className="text-2xl font-black mb-5">
              Cart
            </h2>

            <div className="space-y-4 max-h-80 overflow-auto">

              {cart.map((item) => (

                <div
                  key={item.id}
                  className="bg-gray-800 p-4 rounded-2xl"
                >

                  <div className="flex justify-between items-center">

                    <div>
                      <h3 className="font-bold">
                        {item.name}
                      </h3>

                      <p className="text-emerald-400">
                        ৳ {item.price}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">

                      <button
                        onClick={() =>
                          decreaseQuantity(
                            item.id
                          )
                        }
                        className="bg-red-600 w-8 h-8 rounded-full"
                      >
                        -
                      </button>

                      <span>
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          increaseQuantity(
                            item.id
                          )
                        }
                        className="bg-green-600 w-8 h-8 rounded-full"
                      >
                        +
                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

            <div className="mt-6 border-t border-gray-700 pt-5">

              <div className="flex justify-between mb-3">
                <span>Total</span>

                <span className="font-black">
                  ৳ {cartTotal}
                </span>
              </div>

              <div className="flex justify-between mb-5">
                <span>
                  Commission
                </span>

                <span className="text-emerald-400">
                  ৳ {commission}
                </span>
              </div>

              <button
                disabled={submitting}
                onClick={checkout}
                className="w-full bg-emerald-500 text-black py-4 rounded-2xl font-black flex items-center justify-center gap-3"
              >
                <ShoppingCart />

                {submitting
                  ? "Processing..."
                  : "Checkout"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* TOAST */}

      <AnimatePresence>

        {toast && (

          <motion.div
            initial={{
              opacity: 0,
              y: 100,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 100,
            }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 px-8 py-4 rounded-2xl z-[100]"
          >
            {toast}
          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
}

export default App;
