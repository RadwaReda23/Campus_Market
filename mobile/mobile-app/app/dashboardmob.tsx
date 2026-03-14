import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  title: string;
  price: number;
  condition: string;
  seller: string;
  sellerType: "طالب" | "دكتور" | "خريجة" | "خريج" | "موظف";
  category: string;
  image: string;
  views: number;
  time: string;
  status: "active" | "sold";
}

interface LibraryItem {
  id: number;
  title: string;
  available: boolean;
  borrower: string | null;
  image: string;
  category: string;
}

interface LostFoundItem {
  id: number;
  title: string;
  description: string;
  finder: string;
  location: string;
  date: string;
  image: string;
  claimed: boolean;
}

interface Message {
  id: number;
  from: string;
  product: string;
  message: string;
  time: string;
  unread: boolean;
}

interface StatItem {
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}

interface ProfileField {
  label: string;
  value: string;
  icon: string;
}

interface ProfileStat {
  num: string;
  label: string;
}

type PageId = "home" | "products" | "library" | "lostfound" | "messages" | "profile";

// ─── COLORS ───────────────────────────────────────────────────────────────────

const COLORS = {
  primary: "#1a3a2a",
  accent: "#c8a84b",
  light: "#f5f0e8",
  white: "#ffffff",
  muted: "#8a7d6b",
  danger: "#c0392b",
  success: "#27ae60",
  info: "#2980b9",
  border: "#ddd3c0",
  cardBg: "#fffdf8",
} as const;

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const mockProducts: Product[] = [
  { id: 1, title: "كتاب حساب التفاضل والتكامل", price: 45, condition: "جيد جداً", seller: "أحمد محمد", sellerType: "طالب", category: "كتب", image: "📚", views: 34, time: "منذ ساعتين", status: "active" },
  { id: 2, title: "ميكروسكوب محمول", price: 320, condition: "ممتاز", seller: "د. سارة علي", sellerType: "دكتور", category: "معدات", image: "🔬", views: 87, time: "منذ يوم", status: "active" },
  { id: 3, title: "كول روب معمل", price: 30, condition: "مقبول", seller: "فاطمة حسن", sellerType: "خريجة", category: "ملابس", image: "🥼", views: 19, time: "منذ 3 أيام", status: "active" },
  { id: 4, title: "آلة حاسبة علمية Casio", price: 150, condition: "جيد", seller: "محمود إبراهيم", sellerType: "طالب", category: "أدوات", image: "🔢", views: 52, time: "منذ 5 أيام", status: "active" },
  { id: 5, title: "كتاب الكيمياء العضوية", price: 60, condition: "جيد جداً", seller: "نور أحمد", sellerType: "خريجة", category: "كتب", image: "📗", views: 41, time: "منذ أسبوع", status: "sold" },
  { id: 6, title: "حقيبة ظهر للكلية", price: 85, condition: "جيد", seller: "يوسف سامي", sellerType: "طالب", category: "أخرى", image: "🎒", views: 28, time: "منذ أسبوعين", status: "active" },
];

const mockLibrary: LibraryItem[] = [
  { id: 1, title: "بالطو معمل مقاس L", available: true, borrower: null, image: "🥼", category: "ملابس" },
  { id: 2, title: "بالطو معمل مقاس M", available: false, borrower: "علي حسن", image: "🥼", category: "ملابس" },
  { id: 3, title: "نظارة واقية", available: true, borrower: null, image: "🥽", category: "معدات" },
  { id: 4, title: "قفازات معمل", available: true, borrower: null, image: "🧤", category: "معدات" },
  { id: 5, title: "بالطو معمل مقاس S", available: false, borrower: "منى إبراهيم", image: "🥼", category: "ملابس" },
];

const mockLostFound: LostFoundItem[] = [
  { id: 1, title: "محفظة جلد بنية", description: "وُجدت بالقرب من قاعة 101", finder: "طالب مجهول", location: "مبنى A", date: "اليوم", image: "👛", claimed: false },
  { id: 2, title: "كارنيه جامعي", description: "اسم الطالب: م.م.غير واضح", finder: "حارس الأمن", location: "عند البوابة", date: "أمس", image: "🪪", claimed: false },
  { id: 3, title: "مفاتيح خضراء", description: "مفتاحين على حلقة خضراء", finder: "دكتورة ريم", location: "معمل 3", date: "منذ يومين", image: "🔑", claimed: true },
];

const mockMessages: Message[] = [
  { id: 1, from: "أحمد محمد", product: "كتاب حساب التفاضل", message: "هل الكتاب لا يزال متاحاً؟", time: "منذ 10 دقائق", unread: true },
  { id: 2, from: "فاطمة علي", product: "ميكروسكوب محمول", message: "هل يمكن التفاوض في السعر؟", time: "منذ ساعة", unread: true },
  { id: 3, from: "محمود سامي", product: "كول روب معمل", message: "متى يمكن الاستلام؟", time: "أمس", unread: false },
];

const stats: StatItem[] = [
  { label: "منتج نشط", value: "142", icon: "🛒", color: COLORS.primary },
  { label: "صفقة مكتملة", value: "89", icon: "✅", color: COLORS.success },
  { label: "مستخدم مسجل", value: "1.2k", icon: "👥", color: COLORS.info },
  { label: "عنصر في المكتبة", value: "38", icon: "📚", color: COLORS.accent },
];

const navItems: NavItem[] = [
  { id: "home", label: "الرئيسية", icon: "🏠" },
  { id: "products", label: "المنتجات", icon: "🛒" },
  { id: "library", label: "المكتبة", icon: "📚" },
  { id: "lostfound", label: "المفقودات", icon: "🔍" },
  { id: "messages", label: "الرسائل", icon: "💬" },
  { id: "profile", label: "حسابي", icon: "👤" },
];

// ─── DRAWER ───────────────────────────────────────────────────────────────────

interface DrawerProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  visible: boolean;
  onClose: () => void;
  unreadCount: number;
}

function Drawer({ activePage, setActivePage, visible, onClose, unreadCount }: DrawerProps) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.drawer}>
          {/* Logo */}
          <View style={styles.drawerLogo}>
            <View style={styles.logoIcon}>
              <Text style={{ fontSize: 20 }}>🔬</Text>
            </View>
            <View>
              <Text style={styles.logoTitle}>سوق كلية العلوم</Text>
              <Text style={styles.logoSub}>جامعة القاهرة</Text>
            </View>
          </View>

          {/* Nav */}
          <ScrollView style={{ flex: 1, padding: 12 }}>
            {navItems.map((item: NavItem) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.navItem, activePage === item.id && styles.navItemActive]}
                onPress={() => { setActivePage(item.id); onClose(); }}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[styles.navLabel, activePage === item.id && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {item.id === "messages" && unreadCount > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Logout */}
          <TouchableOpacity
            style={styles.drawerLogout}
            onPress={() => Alert.alert("تسجيل الخروج", "تم تسجيل الخروج بنجاح!")}
          >
            <Text style={styles.drawerLogoutText}>🚪 تسجيل الخروج</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  activePage: PageId;
  onMenuPress: () => void;
  onBellPress: () => void;
  onAvatarPress: () => void;
  unreadCount: number;
}

function TopBar({ activePage, onMenuPress, onBellPress, onAvatarPress, unreadCount }: TopBarProps) {
  const page = navItems.find((n: NavItem) => n.id === activePage);
  return (
    <View style={styles.topbar}>
      <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
        <Text style={{ fontSize: 20 }}>☰</Text>
      </TouchableOpacity>
      <Text style={styles.pageTitle}>{page?.icon} {page?.label}</Text>
      <View style={styles.topbarRight}>
        <TouchableOpacity onPress={onBellPress} style={{ position: "relative", marginLeft: 12 }}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onAvatarPress} style={styles.avatar}>
          <Text style={styles.avatarText}>م</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

interface HomePageProps {
  setActivePage: (page: PageId) => void;
}

function HomePage({ setActivePage }: HomePageProps) {
  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Alert Strip */}
      <View style={styles.alertStrip}>
        <Text style={{ fontSize: 14 }}>📢</Text>
        <Text style={styles.alertText}>
          <Text style={{ fontWeight: "700" }}>جديد! </Text>
          تم إضافة 5 منتجات جديدة اليوم
        </Text>
        <TouchableOpacity onPress={() => setActivePage("products")}>
          <Text style={styles.alertLink}>عرض الكل ←</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((s: StatItem, i: number) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + "20" }]}>
              <Text style={{ fontSize: 22 }}>{s.icon}</Text>
            </View>
            <View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Products */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🛒 أحدث المنتجات</Text>
          <TouchableOpacity onPress={() => setActivePage("products")}>
            <Text style={styles.sectionLink}>عرض الكل ←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sectionBody}>
          {mockProducts.slice(0, 4).map((p: Product) => (
            <View key={p.id} style={styles.miniProductRow}>
              <Text style={{ fontSize: 28 }}>{p.image}</Text>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={styles.miniProductTitle}>{p.title}</Text>
                <Text style={styles.miniProductSub}>{p.seller} · {p.time}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.miniProductPrice}>{p.price} ج</Text>
                <Text style={styles.miniProductViews}>{p.views} مشاهدة</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Lost & Found Preview */}
      <View style={[styles.sectionCard, { marginTop: 16 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔍 المفقودات الأخيرة</Text>
          <TouchableOpacity onPress={() => setActivePage("lostfound")}>
            <Text style={styles.sectionLink}>عرض الكل ←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sectionBody}>
          {mockLostFound
            .filter((l: LostFoundItem) => !l.claimed)
            .slice(0, 2)
            .map((item: LostFoundItem) => (
              <LostItem key={item.id} item={item} compact />
            ))}
        </View>
      </View>

      {/* Unread Messages */}
      <View style={[styles.sectionCard, { marginTop: 16, marginBottom: 24 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💬 الرسائل الجديدة</Text>
          <TouchableOpacity onPress={() => setActivePage("messages")}>
            <Text style={styles.sectionLink}>عرض الكل ←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sectionBody}>
          {mockMessages
            .filter((m: Message) => m.unread)
            .map((msg: Message) => (
              <MessageItem key={msg.id} msg={msg} />
            ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

function ProductsPage() {
  const [activeFilter, setActiveFilter] = useState<string>("الكل");
  const filters: string[] = ["الكل", "كتب", "معدات", "ملابس", "أدوات", "أخرى"];
  const filtered: Product[] =
    activeFilter === "الكل"
      ? mockProducts
      : mockProducts.filter((p: Product) => p.category === activeFilter);

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.pageTopRow}>
        <Text style={styles.resultCount}>
          عرض <Text style={{ fontWeight: "700" }}>{filtered.length}</Text> منتج
        </Text>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ إضافة منتج</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {filters.map((f: string) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.productsGrid}>
        {filtered.map((p: Product) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

interface ProductCardProps {
  p: Product;
}

function ProductCard({ p }: ProductCardProps) {
  const sellerTypeStyle =
    p.sellerType === "طالب" ? styles.typeStudent :
    p.sellerType === "دكتور" ? styles.typeDoctor :
    p.sellerType === "خريجة" || p.sellerType === "خريج" ? styles.typeGrad :
    styles.typeStaff;

  return (
    <TouchableOpacity style={styles.productCard} activeOpacity={0.85}>
      <View style={styles.productImage}>
        <Text style={{ fontSize: 44 }}>{p.image}</Text>
        <View style={[styles.productBadge, p.status === "active" ? styles.badgeActive : styles.badgeSold]}>
          <Text style={[styles.productBadgeText, { color: p.status === "active" ? COLORS.success : COLORS.danger }]}>
            {p.status === "active" ? "متاح" : "تم البيع"}
          </Text>
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>{p.title}</Text>
        <View style={styles.conditionBadge}>
          <Text style={styles.conditionText}>الحالة: {p.condition}</Text>
        </View>
        <Text style={styles.productPrice}>
          {p.price} <Text style={styles.priceUnit}>جنيه</Text>
        </Text>
        <View style={styles.productMeta}>
          <View>
            <Text style={styles.productSeller}>{p.seller}</Text>
            <View style={[styles.sellerType, sellerTypeStyle]}>
              <Text style={[styles.sellerTypeText, sellerTypeStyle]}>{p.sellerType}</Text>
            </View>
          </View>
          <Text style={styles.productViews}>👁 {p.views}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── LIBRARY ──────────────────────────────────────────────────────────────────

function LibraryPage() {
  const [activeTab, setActiveTab] = useState<"borrow" | "lostfound">("borrow");

  const tabs: { id: "borrow" | "lostfound"; label: string }[] = [
    { id: "borrow", label: "🥼 الاستعارة" },
    { id: "lostfound", label: "🔍 المفقودات" },
  ];

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.alertStrip, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
        <Text>📚</Text>
        <Text style={[styles.alertText, { flex: 1 }]}>
          المكتبة مكان للاستعارة <Text style={{ fontWeight: "700" }}>المجانية</Text> — يُرجى إعادة العناصر بعد الاستخدام
        </Text>
      </View>

      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.libTab, activeTab === t.id && styles.libTabActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[styles.libTabText, activeTab === t.id && styles.libTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "borrow" && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🥼 عناصر الاستعارة المجانية</Text>
            <Text style={{ fontSize: 11, color: COLORS.muted }}>
              {mockLibrary.filter((l: LibraryItem) => l.available).length} من {mockLibrary.length} متاح
            </Text>
          </View>
          <View style={styles.sectionBody}>
            {mockLibrary.map((item: LibraryItem) => (
              <View key={item.id} style={styles.libItem}>
                <Text style={{ fontSize: 26 }}>{item.image}</Text>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.libTitle}>{item.title}</Text>
                  <Text style={[styles.libStatus, { color: item.available ? COLORS.success : COLORS.danger }]}>
                    {item.available ? "✅ متاح للاستعارة" : `❌ مستعار: ${item.borrower}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.borrowBtn, item.available ? styles.btnPrimary : styles.btnDisabled]}
                  disabled={!item.available}
                >
                  <Text style={styles.borrowBtnText}>{item.available ? "استعر الآن" : "غير متاح"}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {activeTab === "lostfound" && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔍 المفقودات في الكلية</Text>
            <TouchableOpacity style={[styles.addBtn, { paddingVertical: 6, paddingHorizontal: 12 }]}>
              <Text style={styles.addBtnText}>+ أضف مفقود</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionBody}>
            {mockLostFound.map((item: LostFoundItem) => (
              <LostItem key={item.id} item={item} showClaim />
            ))}
          </View>
        </View>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── LOST & FOUND ─────────────────────────────────────────────────────────────

interface LostItemProps {
  item: LostFoundItem;
  compact?: boolean;
  showClaim?: boolean;
}

function LostItem({ item, compact = false, showClaim = false }: LostItemProps) {
  return (
    <View style={styles.lostItem}>
      <Text style={{ fontSize: compact ? 28 : 36 }}>{item.image}</Text>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={styles.lostTitle}>{item.title}</Text>
        <Text style={styles.lostDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.lostTags}>
          {!compact && <Text style={styles.lostTag}>👤 {item.finder}</Text>}
          <Text style={styles.lostTag}>📍 {item.location}</Text>
          <Text style={styles.lostTag}>🕐 {item.date}</Text>
          {item.claimed && (
            <Text style={[styles.lostTag, styles.claimedBadge]}>✅ تم الاسترداد</Text>
          )}
        </View>
      </View>
      {showClaim && (
        <TouchableOpacity
          style={[styles.borrowBtn, !item.claimed ? styles.btnPrimary : styles.btnDisabled]}
          disabled={item.claimed}
        >
          <Text style={styles.borrowBtnText}>{item.claimed ? "مُسترد" : "ملكي 🙋"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function LostFoundPage() {
  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.pageTopRow}>
        <Text style={[styles.resultCount, { flex: 1 }]}>لقيت حاجة في الكلية؟ سجلها هنا</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ إضافة مفقود</Text>
        </TouchableOpacity>
      </View>
      {mockLostFound.map((item: LostFoundItem) => (
        <View key={item.id} style={[styles.lostItem, { marginBottom: 12 }]}>
          <Text style={{ fontSize: 36 }}>{item.image}</Text>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.lostTitle}>{item.title}</Text>
            <Text style={styles.lostDesc}>{item.description}</Text>
            <View style={styles.lostTags}>
              <Text style={styles.lostTag}>👤 {item.finder}</Text>
              <Text style={styles.lostTag}>📍 {item.location}</Text>
              <Text style={styles.lostTag}>🕐 {item.date}</Text>
              {item.claimed && (
                <Text style={[styles.lostTag, styles.claimedBadge]}>✅ تم الاسترداد</Text>
              )}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <TouchableOpacity
              style={[styles.borrowBtn, !item.claimed ? styles.btnPrimary : styles.btnDisabled]}
              disabled={item.claimed}
            >
              <Text style={styles.borrowBtnText}>{item.claimed ? "مُسترد" : "ملكي 🙋"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactBtn}>
              <Text style={styles.contactBtnText}>💬 تواصل</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

interface MessageItemProps {
  msg: Message;
}

function MessageItem({ msg }: MessageItemProps) {
  return (
    <TouchableOpacity style={[styles.messageItem, msg.unread && styles.messageItemUnread]}>
      <View style={styles.msgAvatar}>
        <Text style={styles.msgAvatarText}>{msg.from[0]}</Text>
      </View>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.msgFrom}>{msg.from}</Text>
          {msg.unread && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>جديد</Text>
            </View>
          )}
        </View>
        <Text style={styles.msgProduct}>📦 {msg.product}</Text>
        <Text style={styles.msgText} numberOfLines={1}>{msg.message}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text style={styles.msgTime}>{msg.time}</Text>
        <TouchableOpacity style={[styles.borrowBtn, styles.btnPrimary]}>
          <Text style={styles.borrowBtnText}>رد</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

interface MessagesPageProps {
  unreadCount: number;
}

function MessagesPage({ unreadCount }: MessagesPageProps) {
  const [activeFilter, setActiveFilter] = useState<string>("الكل");
  const filters: string[] = ["الكل", `غير مقروءة (${unreadCount})`, "المنتجات", "المفقودات"];

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {filters.map((f: string) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {mockMessages.map((msg: Message) => (
        <MessageItem key={msg.id} msg={msg} />
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

function ProfilePage() {
  const profileFields: ProfileField[] = [
    { label: "الاسم", value: "محمد أحمد السيد", icon: "👤" },
    { label: "البريد الإلكتروني", value: "m.ahmed@sci.cu.edu.eg", icon: "📧" },
    { label: "الرقم الجامعي", value: "20210234", icon: "🪪" },
    { label: "القسم", value: "الفيزياء", icon: "⚛️" },
  ];

  const profileStats: ProfileStat[] = [
    { num: "12", label: "منتج معروض" },
    { num: "8", label: "صفقة مكتملة" },
    { num: "4.8 ⭐", label: "التقييم" },
  ];

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>م</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>محمد أحمد السيد</Text>
          <Text style={styles.profileRole}>🎓 طالب — الفرقة الثالثة، قسم الفيزياء</Text>
          <View style={styles.profileStats}>
            {profileStats.map((s: ProfileStat, i: number) => (
              <View key={i} style={styles.pstat}>
                <Text style={styles.pstatNum}>{s.num}</Text>
                <Text style={styles.pstatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* My Products */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🛒 منتجاتي</Text>
          <TouchableOpacity style={[styles.addBtn, { paddingVertical: 6, paddingHorizontal: 12 }]}>
            <Text style={styles.addBtnText}>+ إضافة</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sectionBody}>
          {mockProducts.slice(0, 3).map((p: Product) => (
            <View key={p.id} style={styles.miniProductRow}>
              <Text style={{ fontSize: 24 }}>{p.image}</Text>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={styles.miniProductTitle}>{p.title}</Text>
                <Text style={styles.miniProductSub}>{p.views} مشاهدة</Text>
              </View>
              <Text style={styles.miniProductPrice}>{p.price} ج</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Settings */}
      <View style={[styles.sectionCard, { marginTop: 16, marginBottom: 24 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚙️ إعدادات الحساب</Text>
        </View>
        <View style={styles.sectionBody}>
          {profileFields.map((field: ProfileField, i: number) => (
            <View key={i} style={styles.settingsRow}>
              <Text style={{ fontSize: 18 }}>{field.icon}</Text>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={styles.settingsLabel}>{field.label}</Text>
                <Text style={styles.settingsValue}>{field.value}</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.editLink}>تعديل</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── BOTTOM TABS ──────────────────────────────────────────────────────────────

interface BottomTabsProps {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  unreadCount: number;
}

function BottomTabs({ activePage, setActivePage, unreadCount }: BottomTabsProps) {
  return (
    <View style={styles.bottomTabs}>
      {navItems.map((item: NavItem) => (
        <TouchableOpacity
          key={item.id}
          style={styles.tabItem}
          onPress={() => setActivePage(item.id)}
        >
          <View style={{ position: "relative" }}>
            <Text style={[styles.tabIcon, activePage === item.id && styles.tabIconActive]}>
              {item.icon}
            </Text>
            {item.id === "messages" && unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.tabLabel, activePage === item.id && styles.tabLabelActive]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          {activePage === item.id && <View style={styles.tabActiveBar} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("home");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const unreadCount: number = mockMessages.filter((m: Message) => m.unread).length;

  const renderPage = (): React.ReactElement => {
    switch (activePage) {
      case "home":      return <HomePage setActivePage={setActivePage} />;
      case "products":  return <ProductsPage />;
      case "library":   return <LibraryPage />;
      case "lostfound": return <LostFoundPage />;
      case "messages":  return <MessagesPage unreadCount={unreadCount} />;
      case "profile":   return <ProfilePage />;
      default:          return <HomePage setActivePage={setActivePage} />;
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />

      <Drawer
        activePage={activePage}
        setActivePage={setActivePage}
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        unreadCount={unreadCount}
      />
      <TopBar
        activePage={activePage}
        onMenuPress={() => setDrawerOpen(true)}
        onBellPress={() => setActivePage("messages")}
        onAvatarPress={() => setActivePage("profile")}
        unreadCount={unreadCount}
      />
      <View style={{ flex: 1, backgroundColor: COLORS.light }}>
        {renderPage()}
      </View>
      <BottomTabs
        activePage={activePage}
        setActivePage={setActivePage}
        unreadCount={unreadCount}
      />
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },

  // Drawer
  drawerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", flexDirection: "row" },
  drawer: { width: 260, backgroundColor: COLORS.primary, height: "100%" },
  drawerLogo: { padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(200,168,75,0.3)", flexDirection: "row", alignItems: "center", gap: 12 },
  logoIcon: { width: 44, height: 44, backgroundColor: COLORS.accent, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoTitle: { color: "white", fontSize: 13, fontWeight: "700" },
  logoSub: { color: COLORS.accent, fontSize: 11 },
  navItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 4 },
  navItemActive: { backgroundColor: COLORS.accent },
  navIcon: { fontSize: 18, width: 28, textAlign: "center" },
  navLabel: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginRight: 8, flex: 1 },
  navLabelActive: { color: COLORS.primary, fontWeight: "700" },
  navBadge: { backgroundColor: COLORS.danger, borderRadius: 9, width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  navBadgeText: { color: "white", fontSize: 10, fontWeight: "700" },
  drawerLogout: { padding: 20, borderTopWidth: 1, borderTopColor: "rgba(200,168,75,0.2)" },
  drawerLogoutText: { color: "#ff6b6b", fontSize: 14, fontWeight: "700" },

  // TopBar
  topbar: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: COLORS.border },
  menuBtn: { padding: 6, marginLeft: 8 },
  pageTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: COLORS.primary, textAlign: "right", marginHorizontal: 10 },
  topbarRight: { flexDirection: "row", alignItems: "center" },
  bellBadge: { position: "absolute", top: -4, right: -4, backgroundColor: COLORS.danger, borderRadius: 8, width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  bellBadgeText: { color: "white", fontSize: 9, fontWeight: "700" },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: 4 },
  avatarText: { color: "white", fontWeight: "700", fontSize: 14 },

  // Content
  content: { flex: 1, padding: 16 },

  // Alert Strip
  alertStrip: { backgroundColor: COLORS.accent + "22", borderWidth: 1, borderColor: COLORS.accent + "44", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  alertText: { fontSize: 13, color: COLORS.primary, flex: 1 },
  alertLink: { color: COLORS.accent, fontWeight: "600", fontSize: 12 },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: COLORS.white, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: COLORS.border },
  statIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "900", color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 1 },

  // Section Card
  sectionCard: { backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  sectionHeader: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  sectionLink: { fontSize: 12, color: COLORS.accent, fontWeight: "600" },
  sectionBody: { padding: 14 },

  // Mini Product Row
  miniProductRow: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, backgroundColor: COLORS.cardBg },
  miniProductTitle: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  miniProductSub: { fontSize: 11, color: COLORS.muted },
  miniProductPrice: { fontSize: 14, fontWeight: "900", color: COLORS.accent },
  miniProductViews: { fontSize: 10, color: COLORS.muted },

  // Products Grid
  productsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  productCard: { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  productImage: { height: 90, backgroundColor: COLORS.light, alignItems: "center", justifyContent: "center", position: "relative" },
  productBadge: { position: "absolute", top: 6, left: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  badgeActive: { backgroundColor: "#d4f4e0" },
  badgeSold: { backgroundColor: "#fde8e8" },
  productBadgeText: { fontSize: 10, fontWeight: "700" },
  productInfo: { padding: 10 },
  productTitle: { fontSize: 12, fontWeight: "700", color: COLORS.primary, marginBottom: 4, lineHeight: 16 },
  conditionBadge: { backgroundColor: COLORS.light, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start", marginBottom: 4 },
  conditionText: { fontSize: 10, color: COLORS.muted },
  productPrice: { fontSize: 16, fontWeight: "900", color: COLORS.accent },
  priceUnit: { fontSize: 11, fontWeight: "400", color: COLORS.muted },
  productMeta: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 },
  productSeller: { fontSize: 10, color: COLORS.muted },
  productViews: { fontSize: 10, color: COLORS.muted },
  sellerType: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, alignSelf: "flex-start", marginTop: 2 },
  sellerTypeText: { fontSize: 10, fontWeight: "700" },
  typeStudent: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  typeDoctor: { backgroundColor: "#fce7f3", color: "#be185d" },
  typeGrad: { backgroundColor: "#dcfce7", color: "#15803d" },
  typeStaff: { backgroundColor: "#fef3c7", color: "#b45309" },

  // Filter
  pageTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  resultCount: { fontSize: 13, color: COLORS.muted },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  addBtnText: { color: "white", fontWeight: "700", fontSize: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, marginLeft: 8 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, color: COLORS.muted },
  filterChipTextActive: { color: "white" },

  // Library
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  libTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white },
  libTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  libTabText: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  libTabTextActive: { color: "white" },
  libItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, backgroundColor: COLORS.cardBg },
  libTitle: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  libStatus: { fontSize: 11, marginTop: 2 },
  borrowBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnDisabled: { backgroundColor: COLORS.border },
  borrowBtnText: { color: "white", fontSize: 12, fontWeight: "700" },

  // Lost & Found
  lostItem: { flexDirection: "row", alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBg },
  lostTitle: { fontSize: 14, fontWeight: "700", color: COLORS.primary, marginBottom: 2 },
  lostDesc: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  lostTags: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  lostTag: { fontSize: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: COLORS.light, color: COLORS.muted },
  claimedBadge: { backgroundColor: "#d4f4e0", color: COLORS.success },
  contactBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  contactBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },

  // Messages
  messageItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, backgroundColor: COLORS.cardBg },
  messageItemUnread: { borderRightWidth: 3, borderRightColor: COLORS.accent, backgroundColor: "#fffbf0" },
  msgAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  msgAvatarText: { color: "white", fontWeight: "700", fontSize: 14 },
  msgFrom: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  msgProduct: { fontSize: 11, color: COLORS.accent },
  msgText: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  msgTime: { fontSize: 11, color: COLORS.muted },
  newBadge: { backgroundColor: COLORS.accent, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  newBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: "700" },

  // Profile
  profileHeader: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 16 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: 26, fontWeight: "900", color: COLORS.primary },
  profileName: { fontSize: 18, fontWeight: "700", color: "white" },
  profileRole: { color: COLORS.accent, fontSize: 12, marginTop: 3 },
  profileStats: { flexDirection: "row", gap: 20, marginTop: 12 },
  pstat: { alignItems: "center" },
  pstatNum: { fontSize: 17, fontWeight: "900", color: "white" },
  pstatLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  settingsRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, backgroundColor: COLORS.cardBg },
  settingsLabel: { fontSize: 11, color: COLORS.muted },
  settingsValue: { fontSize: 13, fontWeight: "600", color: COLORS.primary },
  editLink: { fontSize: 12, color: COLORS.accent, fontWeight: "600" },

  // Bottom Tabs
  bottomTabs: { flexDirection: "row", backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 6, paddingTop: 6 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 4, position: "relative" },
  tabIcon: { fontSize: 20, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  tabLabelActive: { color: COLORS.primary, fontWeight: "700" },
  tabActiveBar: { position: "absolute", top: 0, width: 20, height: 2, backgroundColor: COLORS.accent, borderRadius: 2 },
  tabBadge: { position: "absolute", top: -4, right: -6, backgroundColor: COLORS.danger, borderRadius: 7, width: 14, height: 14, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { color: "white", fontSize: 8, fontWeight: "700" },
});
