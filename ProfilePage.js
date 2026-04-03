import React, { useState } from 'react';
import axios from 'axios';
import { COLORS, mockProducts } from "../constants";

export default function ProfilePage() {
  // 1. حالات (States) الرفع والمعاينة
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

  // 2. دالة التعامل مع اختيار الصورة
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadedImageUrl(null);
      setUploadProgress(0);
    }
  };

  // 3. دالة الرفع إلى Cloudinary (كما في الكود الخاص بك)
  const handleUpload = async () => {
    if (!selectedImage) {
      alert("الرجاء اختيار صورة أولاً");
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedImage);
    formData.append('upload_preset', 'usersuploadimage');
    formData.append('cloud_name', 'dhcwjg2xf');

    try {
      const response = await axios.post(
        'https://api.cloudinary.com/v1_1/dhcwjg2xf/image/upload',
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          },
        }
      );

      const imageURL = response.data.secure_url;
      setUploadedImageUrl(imageURL);
      localStorage.setItem("userImage", imageURL);
      console.log("تم الرفع بنجاح! الرابط:", imageURL);
    } catch (error) {
      console.error("حدث خطأ أثناء الرفع", error);
      alert("فشل رفع الصورة، يرجى المحاولة مرة أخرى.");
      setUploadProgress(0);
    }
  };

  return (
    <>
      <div className="profile-header">
        {/* منطقة الصورة الشخصية مع إمكانية الرفع */}
        <div className="profile-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* عرض صورة المعاينة أو الصورة المرفوعة، وإذا لم يوجد يعرض الحرف "م" */}
          {previewUrl || uploadedImageUrl ? (
            <img
              src={uploadedImageUrl || previewUrl}
              alt="Profile"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : "م"}

          {/* Input مخفي يغطي الدائرة لاختيار الصورة */}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{
              position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer'
            }}
          />
        </div>

        <div>
          <div className="profile-name">محمد أحمد السيد</div>
          <div className="profile-role">🎓 طالب — الفرقة الثالثة، قسم الفيزياء</div>

          {/* عرض زر "رفع الآن" فقط عند اختيار صورة جديدة */}
          {selectedImage && !uploadedImageUrl && (
            <button
              onClick={handleUpload}
              className="add-btn"
              style={{ marginTop: 10, fontSize: 11, background: COLORS.accent }}
            >
              {uploadProgress > 0 ?' جاري الرفع: ${uploadProgress}%' : "تأكيد الرفع ⬆️"}
            </button>
          )}

          <div className="profile-stats">
            <div className="pstat"><div className="pstat-num">12</div><div className="pstat-label">منتج معروض</div></div>
            <div className="pstat"><div className="pstat-num">8</div><div className="pstat-label">صفقة مكتملة</div></div>
            <div className="pstat"><div className="pstat-num">4.8 ⭐</div><div className="pstat-label">التقييم</div></div>
          </div>
        </div>
      </div>

      <div className="two-col">
        {/* قسم المنتجات */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">🛒 منتجاتي</span>
            <button className="add-btn" style={{ fontSize: 12, padding: "6px 12px" }}>+ إضافة</button>
          </div>
          <div className="section-body">
            {mockProducts.slice(0, 3).map(p => (
              <div key={p.id} className="product-item" style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px", borderRadius: 8,
                border: ' 1px solid ${COLORS.border}', marginBottom: 8,
            background: COLORS.cardBg,
              }}>
            <span style={{ fontSize: 24 }}>{p.image}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{p.title}</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>{p.views} مشاهدة</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: COLORS.accent }}>{p.price} ج</span>
          </div>
            ))}
        </div>
      </div>

      {/* قسم إعدادات الحساب */}
      <div className="section-card">
        <div className="section-header">
          <span className="section-title">⚙️ إعدادات الحساب</span>
        </div>
        <div className="section-body">
          {[
            { label: "الاسم", value: "محمد أحمد السيد", icon: "👤" },
            { label: "البريد الإلكتروني", value: "m.ahmed@sci.cu.edu.eg", icon: "📧" },
            { label: "الرقم الجامعي", value: "20210234", icon: "🪪" },
            { label: "القسم", value: "الفيزياء", icon: "⚛️" },
          ].map((field, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px", borderRadius: 8,
              border:' 1px solid ${COLORS.border}', marginBottom: 8,
          background: COLORS.cardBg,
              }}>
          <span style={{ fontSize: 18 }}>{field.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: COLORS.muted }}>{field.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{field.value}</div>
          </div>
          <span style={{ fontSize: 12, color: COLORS.accent, cursor: "pointer" }}>تعديل</span>
        </div>
            ))}
      </div>
    </div>
      </div >
    </>
  );
}