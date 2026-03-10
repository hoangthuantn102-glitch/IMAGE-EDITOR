import React from 'react';
import { Feature } from './types';

const ICON_CLASS = "h-12 w-12";

export const FEATURES = [
  {
    id: Feature.GenerateFromIdea,
    title: 'Tạo ảnh từ ý tưởng',
    description: 'Biến văn bản hoặc bản phác thảo của bạn thành hình ảnh độc đáo với AI.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.375 3.375 0 0112 18.375V19.5m-3.375-2.625a3.375 3.375 0 01-5.207-3.634 3.375 3.375 0 01.332-5.207 3.375 3.375 0 015.207 3.634 3.375 3.375 0 01-.332 5.207z" />
      </svg>
    ),
  },
  {
    id: Feature.GenerateInvitation,
    title: 'Tạo Thông báo & Thư mời',
    description: 'Tạo các mẫu thông báo, thư mời, giấy mời trang trọng và đẹp mắt.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.981V16.5z" />
      </svg>
    ),
  },
  {
    id: Feature.GeneratePoster,
    title: 'Tạo Poster',
    description: 'Thiết kế poster tự động cho giáo dục, điện ảnh, tiếp thị với AI.',
    icon: (
       <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
       </svg>
    ),
  },
  {
    id: Feature.GenerateAffiliateImage,
    title: 'Tạo ảnh Affiliate',
    description: 'Tải ảnh KOL và sản phẩm, AI sẽ tạo ảnh review/affiliate chuyên nghiệp.',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H5.502c-.656 0-1.189-.585-1.119-1.243l1.263-12a1.875 1.875 0 011.875-1.618h7.498a1.875 1.875 0 011.875 1.618z" />
        </svg>
    )
  },
  {
    id: Feature.GenerateConsistentCharacter,
    title: 'Tạo ảnh nhân vật đồng nhất',
    description: 'Tải lên ảnh nhân vật và mô tả bối cảnh để AI tạo ra ảnh mới với các nhân vật đó.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.14-4.08a5.385 5.385 0 01-5.063 2.924 5.385 5.385 0 01-5.063-2.924m10.126 0a5.385 5.385 0 015.063 2.924 5.385 5.385 0 01-5.063 2.924M12 12a5.385 5.385 0 01-5.063-2.924 5.385 5.385 0 015.063-2.924m0 5.848a5.385 5.385 0 015.063-2.924 5.385 5.385 0 01-5.063-2.924M12 12a5.385 5.385 0 01-5.063 2.924m5.063 0a5.385 5.385 0 01-5.063-2.924" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.37a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM19.5 12a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM4.5 12a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM12 21.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"/>
      </svg>
    ),
  },
  {
    id: Feature.ExtractAccessory,
    title: 'Tách trang phục & phụ kiện',
    description: 'Tải lên ảnh chân dung và mô tả món đồ (áo, mũ, đồng hồ...) để AI tạo ảnh sản phẩm cho món đồ đó.',
    icon: (
       <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
  {
    id: Feature.ChangeBackground,
    title: 'Thay đổi nền ảnh',
    description: 'Thay thế hậu cảnh của ảnh bằng bất cứ thứ gì bạn có thể tưởng tượng với một câu lệnh đơn giản.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: Feature.ChangeOutfit,
    title: 'Thay đổi trang phục',
    description: 'Thay đổi trang phục cho người trong ảnh bằng cách mô tả hoặc tải lên ảnh trang phục mới.',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            <path d="M12 14v-4m-4 4h8" />
        </svg>
    ),
  },
  {
    id: Feature.ReplicatePose,
    title: 'Sao chép dáng',
    description: 'Lấy dáng từ một ảnh và áp dụng cho người trong ảnh khác, giữ nguyên khuôn mặt và phong cách.',
    icon: (
       <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75h.008v.008H12v-.008z" transform="rotate(90 12 12.75)" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75h.008v.008H12v-.008z" transform="rotate(180 12 12.75)" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5h.008v.008H12V4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.75h.008v.008H12v-.008z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75h.008v.008H4.5v-.008z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12.75h.008v.008H19.5v-.008z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.343 7.939l-1.414-1.414" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.071 17.657l-1.414-1.414" />
      </svg>
    ),
  },
  {
    id: Feature.RestorePhoto,
    title: 'Khôi phục ảnh cũ',
    description: 'Làm cho những bức ảnh cũ, mờ hoặc bị hỏng trở nên sắc nét và rõ ràng trở lại.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 18" />
      </svg>
    ),
  },
  {
    id: Feature.IncreaseResolution,
    title: 'Tăng độ phân giải ảnh',
    description: 'Làm cho ảnh của bạn sắc nét và chi tiết hơn, cải thiện chất lượng tổng thể.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
      </svg>
    ),
  },
  {
    id: Feature.ExpandImage,
    title: 'Mở rộng ảnh',
    description: 'Mở rộng khung hình của bạn. AI sẽ tạo ra phần còn lại của hình ảnh một cách liền mạch.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
      </svg>
    ),
  },
  {
    id: Feature.ChangeStyle,
    title: 'Thay đổi phong cách',
    description: 'Biến đổi người trong ảnh của bạn thành các phong cách nghệ thuật khác nhau như anime, tranh vẽ, v.v.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
      </svg>
    ),
  },
  {
    id: Feature.CompositeImages,
    title: 'Ghép ảnh',
    description: 'Kết hợp nhiều ảnh thành một tác phẩm duy nhất dựa trên mô tả của bạn.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 4v16M10 4v16M14 4v16M18 4v16" />
      </svg>
    ),
  },
  {
    id: Feature.GenerateIdPhoto,
    title: 'Tạo ảnh thẻ',
    description: 'Tạo ảnh thẻ chuyên nghiệp với tùy chọn kích thước, nền và trang phục.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: Feature.BeautifyPhoto,
    title: 'Làm đẹp ảnh',
    description: 'Tự động làm mịn da, trang điểm nhẹ và cải thiện các đường nét trên khuôn mặt.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: Feature.GenerateConceptPhoto,
    title: 'Tạo ảnh theo concept',
    description: 'Tải lên ảnh mẫu và mô tả concept để AI tạo ra những bức ảnh nghệ thuật độc đáo.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.793V9a2 2 0 00-2-2h-3.343M3 11.207V15a2 2 0 002 2h3.343M9 3h.01M15 3h.01M21 3h.01M3 9h.01M3 15h.01M3 21h.01M9 21h.01M15 21h.01M21 21h.01M21 9h.01M21 15h.01M12 12h.01" />
      </svg>
    ),
  },
];