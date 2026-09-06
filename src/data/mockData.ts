import type { Product, Representative, Order, ShopSettings } from '@/types';

export const products: Product[] = [
  {
    id: 'p1',
    name: 'مرآة حمام دائرية',
    code: 'A8',
    price: 250,
    wholesalePrice: 200,
    description: 'مرآة حمام دائرية بإطار ألمنيوم مقاوم للصدأ، تعكس صورة واضحة وتضيف لمسة عصرية لحمامك. مناسبة لجميع أنواع الديكورات.',
    weight: '2.5 كغم',
    categoryId: 'c1',
    sizes: [
      { size: '60سم', price: 210, wholesalePrice: 170 },
      { size: '80سم', price: 250, wholesalePrice: 200 },
      { size: '120سم', price: 320, wholesalePrice: 260 }
    ],
    colors: [
      { name: 'أسود', hex: '#1a1a1a' },
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'ذهبي', hex: '#9C7537' },
    ],
    variants: [
      { size: '60سم', color: 'أسود', stock: 15 },
      { size: '120سم', color: 'أسود', stock: 8 },
      { size: '60سم', color: 'أبيض', stock: 20 },
      { size: '120سم', color: 'أبيض', stock: 5 },
      { size: '80سم', color: 'ذهبي', stock: 12 },
      { size: '80سم', color: 'أسود', stock: 6 },
    ],
    image: 'https://images.pexels.com/photos/3148596/pexels-photo-3148596.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [
      'https://images.pexels.com/photos/3148596/pexels-photo-3148596.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/3010775/pexels-photo-3010775.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/6303374/pexels-photo-6303374.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
    ],
  },
  {
    id: 'p2',
    name: 'مرآة حائط مستطيلة',
    code: 'A12',
    price: 320,
    wholesalePrice: 260,
    description: 'مرآة حائط مستطيلة بتصميم أنيق وحواف مصقولة، مثالية للمساحات الصغيرة والكبيرة.',
    weight: '3.2 كغم',
    categoryId: 'c1',
    sizes: [
      { size: '50سم', price: 280, wholesalePrice: 220 },
      { size: '90سم', price: 320, wholesalePrice: 260 },
      { size: '150سم', price: 420, wholesalePrice: 350 }
    ],
    colors: [
      { name: 'أسود', hex: '#1a1a1a' },
      { name: 'فضي', hex: '#c0c0c0' },
    ],
    variants: [
      { size: '50سم', color: 'أسود', stock: 18 },
      { size: '90سم', color: 'أسود', stock: 10 },
      { size: '150سم', color: 'أسود', stock: 4 },
      { size: '50سم', color: 'فضي', stock: 22 },
      { size: '90سم', color: 'فضي', stock: 7 },
    ],
    image: 'https://images.pexels.com/photos/3010775/pexels-photo-3010775.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [
      'https://images.pexels.com/photos/3010775/pexels-photo-3010775.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/3148596/pexels-photo-3148596.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
    ],
  },
  {
    id: 'p3',
    name: 'مرآة مع إضاءة LED',
    code: 'A15',
    price: 480,
    wholesalePrice: 400,
    description: 'مرآة حمام مزودة بإضاءة LED حول الإطار، توفر إضاءة مثالية للاستخدام اليومي مع مظهر فاخر.',
    weight: '4.0 كغم',
    categoryId: 'c1',
    sizes: [
      { size: '70سم', price: 430, wholesalePrice: 350 },
      { size: '100سم', price: 480, wholesalePrice: 400 }
    ],
    colors: [
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'أسود', hex: '#1a1a1a' },
    ],
    variants: [
      { size: '70سم', color: 'أبيض', stock: 9 },
      { size: '100سم', color: 'أبيض', stock: 3 },
      { size: '70سم', color: 'أسود', stock: 6 },
    ],
    image: 'https://images.pexels.com/photos/6303374/pexels-photo-6303374.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [
      'https://images.pexels.com/photos/6303374/pexels-photo-6303374.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/3148596/pexels-photo-3148596.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
    ],
  },
  {
    id: 'p4',
    name: 'مغسلة خزفية بيضاء',
    code: 'B12',
    price: 350,
    wholesalePrice: 290,
    description: 'مغسلة خزفية بيضاء بتصميم أنيق وسطح أملس سهل التنظيف، مناسبة لجميع أنواع الخزائن.',
    weight: '12 كغم',
    categoryId: 'c2',
    sizes: [
      { size: '60سم', price: 300, wholesalePrice: 240 },
      { size: '80سم', price: 350, wholesalePrice: 290 },
      { size: '90سم', price: 400, wholesalePrice: 330 }
    ],
    colors: [
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'بيج', hex: '#e8dcc8' },
    ],
    variants: [
      { size: '60سم', color: 'أبيض', stock: 25 },
      { size: '80سم', color: 'أبيض', stock: 14 },
      { size: '90سم', color: 'أبيض', stock: 8 },
      { size: '60سم', color: 'بيج', stock: 10 },
      { size: '80سم', color: 'بيج', stock: 5 },
    ],
    image: 'https://images.pexels.com/photos/29399425/pexels-photo-29399425.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [
      'https://images.pexels.com/photos/29399425/pexels-photo-29399425.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/29399430/pexels-photo-29399430.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
    ],
  },
  {
    id: 'p5',
    name: 'مغسلة مع سطح رخامي',
    code: 'B18',
    price: 650,
    wholesalePrice: 550,
    description: 'مغسلة فاخرة بسطح رخامي طبيعي وتصميم عصري، تضيف لمسة من الأناقة لحمامك.',
    weight: '18 كغم',
    categoryId: 'c2',
    sizes: [
      { size: '75سم', price: 590, wholesalePrice: 490 },
      { size: '90سم', price: 650, wholesalePrice: 550 }
    ],
    colors: [
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'رمادي', hex: '#8a8a8a' },
    ],
    variants: [
      { size: '75سم', color: 'أبيض', stock: 7 },
      { size: '90سم', color: 'أبيض', stock: 3 },
      { size: '75سم', color: 'رمادي', stock: 4 },
    ],
    image: 'https://images.pexels.com/photos/29399430/pexels-photo-29399430.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [
      'https://images.pexels.com/photos/29399430/pexels-photo-29399430.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/29399425/pexels-photo-29399425.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
    ],
  },
  {
    id: 'p6',
    name: 'مغسلة مع خلاط ذهبي',
    code: 'B22',
    price: 520,
    wholesalePrice: 430,
    description: 'مغسلة أنيقة مزودة بخلاط ذهبي وتصميم مدمج، مثالية للحمامات العصرية.',
    weight: '14 كغم',
    categoryId: 'c2',
    sizes: [
      { size: '70سم', price: 470, wholesalePrice: 390 },
      { size: '85سم', price: 520, wholesalePrice: 430 }
    ],
    colors: [
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'ذهبي', hex: '#9C7537' },
    ],
    variants: [
      { size: '70سم', color: 'أبيض', stock: 12 },
      { size: '85سم', color: 'أبيض', stock: 6 },
      { size: '70سم', color: 'ذهبي', stock: 0 },
    ],
    image: 'https://images.pexels.com/photos/29504872/pexels-photo-29504872.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p7',
    name: 'خزانة حمام خشبية معلقة',
    code: 'C5',
    price: 280,
    wholesalePrice: 230,
    description: 'خزانة حمام خشبية معلقة بثلاث رفوف وبياب خلفي للمرآة، توفر مساحة تخزين إضافية بتصميم أنيق.',
    weight: '6 كغم',
    categoryId: 'c3',
    sizes: [
      { size: '50سم', price: 240, wholesalePrice: 190 },
      { size: '70سم', price: 280, wholesalePrice: 230 }
    ],
    colors: [
      { name: 'بني', hex: '#8B5E3C' },
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'أسود', hex: '#1a1a1a' },
    ],
    variants: [
      { size: '50سم', color: 'بني', stock: 15 },
      { size: '70سم', color: 'بني', stock: 8 },
      { size: '50سم', color: 'أبيض', stock: 10 },
      { size: '70سم', color: 'أبيض', stock: 4 },
      { size: '50سم', color: 'أسود', stock: 6 },
    ],
    image: 'https://images.pexels.com/photos/29412581/pexels-photo-29412581.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [
      'https://images.pexels.com/photos/29412581/pexels-photo-29412581.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/29412578/pexels-photo-29412578.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
    ],
  },
  {
    id: 'p8',
    name: 'خزانة أرضية للحمام',
    code: 'C9',
    price: 450,
    wholesalePrice: 380,
    description: 'خزانة أرضية للحمام بتصميم عصري وسطح مقاوم للماء، تحتوي على أدراج ورفوف للتخزين.',
    weight: '15 كغم',
    categoryId: 'c3',
    sizes: [
      { size: '60سم', price: 390, wholesalePrice: 320 },
      { size: '80سم', price: 450, wholesalePrice: 380 }
    ],
    colors: [
      { name: 'بني', hex: '#8B5E3C' },
      { name: 'رمادي', hex: '#8a8a8a' },
    ],
    variants: [
      { size: '60سم', color: 'بني', stock: 9 },
      { size: '80سم', color: 'بني', stock: 5 },
      { size: '60سم', color: 'رمادي', stock: 3 },
    ],
    image: 'https://images.pexels.com/photos/29412578/pexels-photo-29412578.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p9',
    name: 'سيليكون عازل للماء شفاف',
    code: 'S3',
    price: 35,
    wholesalePrice: 28,
    description: 'سيليكون عازل للماء شفاف عالي الجودة، مثالي لسد الفجوات ومنع تسرب الماء في الحمام.',
    weight: '0.3 كغم',
    categoryId: 'c4',
    sizes: [
      { size: '280مل', price: 30, wholesalePrice: 24 },
      { size: '300مل', price: 35, wholesalePrice: 28 }
    ],
    colors: [
      { name: 'شفاف', hex: '#e8e8e8' },
      { name: 'أبيض', hex: '#f5f5f5' },
    ],
    variants: [
      { size: '280مل', color: 'شفاف', stock: 50 },
      { size: '300مل', color: 'شفاف', stock: 35 },
      { size: '280مل', color: 'أبيض', stock: 28 },
      { size: '300مل', color: 'أبيض', stock: 0 },
    ],
    image: 'https://images.pexels.com/photos/8634408/pexels-photo-8634408.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p10',
    name: 'سيليكون مضاد للفطريات',
    code: 'S7',
    price: 48,
    wholesalePrice: 38,
    description: 'سيليكون مضاد للفطريات والعفن، يدوم طويلاً ويحمي أسطح الحمام من الرطوبة.',
    weight: '0.32 كغم',
    categoryId: 'c4',
    sizes: [
      { size: '280مل', price: 42, wholesalePrice: 33 },
      { size: '300مل', price: 48, wholesalePrice: 38 }
    ],
    colors: [
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'شفاف', hex: '#e8e8e8' },
    ],
    variants: [
      { size: '280مل', color: 'أبيض', stock: 40 },
      { size: '300مل', color: 'أبيض', stock: 22 },
      { size: '280مل', color: 'شفاف', stock: 15 },
    ],
    image: 'https://images.pexels.com/photos/8634410/pexels-photo-8634410.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p11',
    name: 'مقابس كهربائية للحمام',
    code: 'E4',
    price: 65,
    wholesalePrice: 52,
    description: 'مقابس كهربائية مقاومة للماء للحمام، بتصميم آمن وعملي، مناسبة للاستخدام في البيئات الرطبة.',
    weight: '0.2 كغم',
    categoryId: 'c5',
    sizes: [
      { size: 'مفردة', price: 55, wholesalePrice: 44 },
      { size: 'مزدوجة', price: 65, wholesalePrice: 52 }
    ],
    colors: [
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'ذهبي', hex: '#9C7537' },
    ],
    variants: [
      { size: 'مفردة', color: 'أبيض', stock: 60 },
      { size: 'مزدوجة', color: 'أبيض', stock: 35 },
      { size: 'مفردة', color: 'ذهبي', stock: 18 },
      { size: 'مزدوجة', color: 'ذهبي', stock: 9 },
    ],
    image: 'https://images.pexels.com/photos/8634417/pexels-photo-8634417.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p12',
    name: 'مفتاح إضاءة حساس',
    code: 'E8',
    price: 85,
    wholesalePrice: 70,
    description: 'مفتاح إضاءة بالحساس الذكي يعمل باللمس، بتصميم عصري ومقاومة للماء.',
    weight: '0.15 كغم',
    categoryId: 'c5',
    sizes: [
      { size: 'مفرد', price: 75, wholesalePrice: 60 },
      { size: 'مزدوج', price: 85, wholesalePrice: 70 }
    ],
    colors: [
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'أسود', hex: '#1a1a1a' },
    ],
    variants: [
      { size: 'مفرد', color: 'أبيض', stock: 30 },
      { size: 'مزدوج', color: 'أبيض', stock: 20 },
      { size: 'مفرد', color: 'أسود', stock: 12 },
    ],
    image: 'https://images.pexels.com/photos/35209393/pexels-photo-35209393.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p13',
    name: 'خلاط مغسلة كروم',
    code: 'F2',
    price: 120,
    wholesalePrice: 95,
    description: 'خلاط مغسلة بطلاء كروم لامع، يوفر تدفق مياه سلس ويقاوم التآكل.',
    weight: '0.8 كغم',
    categoryId: 'c6',
    sizes: [
      { size: 'قياسي', price: 120, wholesalePrice: 95 }
    ],
    colors: [
      { name: 'كروم', hex: '#c0c0c0' },
      { name: 'ذهبي', hex: '#9C7537' },
      { name: 'أسود', hex: '#1a1a1a' },
    ],
    variants: [
      { size: 'قياسي', color: 'كروم', stock: 40 },
      { size: 'قياسي', color: 'ذهبي', stock: 15 },
      { size: 'قياسي', color: 'أسود', stock: 8 },
    ],
    image: 'https://images.pexels.com/photos/29399427/pexels-photo-29399427.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p14',
    name: 'أنبوب تصريف مغسلة',
    code: 'F6',
    price: 45,
    wholesalePrice: 35,
    description: 'أنبوب تصريف للمغسلة بتصميم مرن ومقاوم للصدأ، سهل التركيب والتنظيف.',
    weight: '0.5 كغم',
    categoryId: 'c6',
    sizes: [
      { size: 'قياسي', price: 40, wholesalePrice: 30 },
      { size: 'مرن', price: 45, wholesalePrice: 35 }
    ],
    colors: [
      { name: 'كروم', hex: '#c0c0c0' },
    ],
    variants: [
      { size: 'قياسي', color: 'كروم', stock: 55 },
      { size: 'مرن', color: 'كروم', stock: 30 },
    ],
    image: 'https://images.pexels.com/photos/28479469/pexels-photo-28479469.png?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p15',
    name: 'حامل منشفة كروم',
    code: 'G3',
    price: 55,
    wholesalePrice: 45,
    description: 'حامل منشفة بطلاء كروم مقاوم للصدأ، تصميم أنيق وعملي لتنظيم مناشف الحمام.',
    weight: '0.4 كغم',
    categoryId: 'c7',
    sizes: [
      { size: 'مفرد', price: 45, wholesalePrice: 35 },
      { size: 'مزدوج', price: 55, wholesalePrice: 45 },
      { size: 'ثلاثي', price: 70, wholesalePrice: 58 }
    ],
    colors: [
      { name: 'كروم', hex: '#c0c0c0' },
      { name: 'أسود', hex: '#1a1a1a' },
      { name: 'ذهبي', hex: '#9C7537' },
    ],
    variants: [
      { size: 'مفرد', color: 'كروم', stock: 45 },
      { size: 'مزدوج', color: 'كروم', stock: 25 },
      { size: 'ثلاثي', color: 'كروم', stock: 12 },
      { size: 'مفرد', color: 'أسود', stock: 18 },
      { size: 'مزدوج', color: 'ذهبي', stock: 5 },
    ],
    image: 'https://images.pexels.com/photos/35209394/pexels-photo-35209394.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [
      'https://images.pexels.com/photos/35209394/pexels-photo-35209394.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/36177447/pexels-photo-36177447.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
    ],
  },
  {
    id: 'p16',
    name: 'رف زجاجي للحمام',
    code: 'G7',
    price: 90,
    wholesalePrice: 72,
    description: 'رف زجاجي شفاف للحمام مع حوامل كروم، مثالي لترتيب مستحضرات التجميل والإكسسوارات.',
    weight: '1.2 كغم',
    categoryId: 'c7',
    sizes: [
      { size: '40سم', price: 75, wholesalePrice: 60 },
      { size: '60سم', price: 90, wholesalePrice: 72 }
    ],
    colors: [
      { name: 'شفاف', hex: '#e8e8e8' },
    ],
    variants: [
      { size: '40سم', color: 'شفاف', stock: 20 },
      { size: '60سم', color: 'شفاف', stock: 10 },
    ],
    image: 'https://images.pexels.com/photos/35209395/pexels-photo-35209395.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p17',
    name: 'حامل ورق تواليت',
    code: 'G10',
    price: 30,
    wholesalePrice: 24,
    description: 'حامل ورق تواليت بتصميم بسيط وأنيق، سهل التركيب ومقاوم للرطوبة.',
    weight: '0.2 كغم',
    categoryId: 'c7',
    sizes: [
      { size: 'قياسي', price: 30, wholesalePrice: 24 }
    ],
    colors: [
      { name: 'كروم', hex: '#c0c0c0' },
      { name: 'أسود', hex: '#1a1a1a' },
    ],
    variants: [
      { size: 'قياسي', color: 'كروم', stock: 80 },
      { size: 'قياسي', color: 'أسود', stock: 25 },
    ],
    image: 'https://images.pexels.com/photos/36177447/pexels-photo-36177447.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'p18',
    name: 'ستارة حمام مقاومة للماء',
    code: 'H1',
    price: 70,
    wholesalePrice: 55,
    description: 'ستارة حمام مقاومة للماء بقماش عالي الجودة، بتصاميم متعددة تناسب جميع الأذواق.',
    weight: '0.6 كغم',
    categoryId: 'c7',
    sizes: [
      { size: '180×200سم', price: 60, wholesalePrice: 48 },
      { size: '200×220سم', price: 70, wholesalePrice: 55 }
    ],
    colors: [
      { name: 'أبيض', hex: '#f5f5f5' },
      { name: 'بيج', hex: '#e8dcc8' },
      { name: 'أزرق', hex: '#3b6e8f' },
    ],
    variants: [
      { size: '180×200سم', color: 'أبيض', stock: 30 },
      { size: '200×220سم', color: 'أبيض', stock: 18 },
      { size: '180×200سم', color: 'بيج', stock: 12 },
      { size: '200×220سم', color: 'أزرق', stock: 8 },
    ],
    image: 'https://images.pexels.com/photos/28457986/pexels-photo-28457986.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: [
      'https://images.pexels.com/photos/28457986/pexels-photo-28457986.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/35209394/pexels-photo-35209394.jpeg?auto=compress&cs=tinysrgb&h=650&w=940'
    ],
  },
];

export const representatives: Representative[] = [
  {
    id: 'r1',
    name: 'أحمد محمد',
    phone: '0597123456',
    username: 'ahmed',
    password: '123456',
    email: 'ahmed@alfajr.com',
    active: true,
    createdAt: '2025-01-15',
  },
  {
    id: 'r2',
    name: 'محمد خالد',
    phone: '0598234567',
    username: 'mohammed',
    password: '123456',
    email: 'mohammed@alfajr.com',
    active: true,
    createdAt: '2025-02-01',
  },
  {
    id: 'r3',
    name: 'سامر علي',
    phone: '0599345678',
    username: 'samer',
    password: '123456',
    email: 'samer@alfajr.com',
    active: true,
    createdAt: '2025-02-20',
  },
  {
    id: 'r4',
    name: 'يوسف حسن',
    phone: '0598456789',
    username: 'yousef',
    password: '123456',
    email: 'yousef@alfajr.com',
    active: false,
    createdAt: '2025-03-10',
  },
];

export const orders: Order[] = [
  {
    id: 'o1',
    number: '1024',
    customerName: 'محمد أحمد',
    customerId: '',
    customerPhone: '0599123456',
    customerAddress: 'طولكرم - شارع النصر',
    notes: 'التوصيل بعد العصر',
    repId: 'r1',
    repName: 'أحمد محمد',
    items: [
      { productId: 'p1', productName: 'مرآة حمام دائرية', productCode: 'A8', size: '120سم', color: 'أسود', quantity: 2, unitPrice: 320, total: 640 },
      { productId: 'p4', productName: 'مغسلة خزفية بيضاء', productCode: 'B12', size: '90سم', color: 'أبيض', quantity: 1, unitPrice: 400, total: 400 },
    ],
    total: 1040,
    status: 'pending',
    createdAt: '2025-08-20T10:30:00',
  },
  {
    id: 'o2',
    number: '1023',
    customerName: 'خالد محمود',
    customerId: '',
    customerPhone: '0598234567',
    customerAddress: 'نابلس - شارع الجامعة',
    notes: '',
    repId: 'r2',
    repName: 'محمد خالد',
    items: [
      { productId: 'p7', productName: 'خزانة حمام خشبية معلقة', productCode: 'C5', size: '70سم', color: 'بني', quantity: 1, unitPrice: 280, total: 280 },
      { productId: 'p15', productName: 'حامل منشفة كروم', productCode: 'G3', size: 'مزدوج', color: 'كروم', quantity: 2, unitPrice: 55, total: 110 },
    ],
    total: 390,
    status: 'completed',
    createdAt: '2025-08-18T14:15:00',
  },
  {
    id: 'o3',
    number: '1022',
    customerName: 'علي حسن',
    customerId: '',
    customerPhone: '0597345678',
    customerAddress: 'قلقيلية - وسط المدينة',
    notes: 'زبون VIP',
    repId: 'r1',
    repName: 'أحمد محمد',
    items: [
      { productId: 'p3', productName: 'مرآة مع إضاءة LED', productCode: 'A15', size: '100سم', color: 'أبيض', quantity: 1, unitPrice: 480, total: 480 },
      { productId: 'p6', productName: 'مغسلة مع خلاط ذهبي', productCode: 'B22', size: '85سم', color: 'أبيض', quantity: 1, unitPrice: 520, total: 520 },
    ],
    total: 1000,
    status: 'completed',
    createdAt: '2025-08-15T09:00:00',
  },
  {
    id: 'o4',
    number: '1021',
    customerName: 'سامي إبراهيم',
    customerId: '',
    customerPhone: '0596456789',
    customerAddress: 'طوباس - الشارع الرئيسي',
    notes: '',
    repId: 'r3',
    repName: 'سامر علي',
    items: [
      { productId: 'p9', productName: 'سيليكون عازل للماء شفاف', productCode: 'S3', size: '280مل', color: 'شفاف', quantity: 5, unitPrice: 30, total: 150 },
      { productId: 'p13', productName: 'خلاط مغسلة كروم', productCode: 'F2', size: 'قياسي', color: 'كروم', quantity: 2, unitPrice: 120, total: 240 },
    ],
    total: 390,
    status: 'pending',
    createdAt: '2025-08-22T11:45:00',
  },
  {
    id: 'o5',
    number: '1020',
    customerName: 'فادي ناصر',
    customerId: '',
    customerPhone: '0595567890',
    customerAddress: 'جنين - حي المرج',
    notes: 'تم الإلغاء لعدم توفر المنتج',
    repId: 'r2',
    repName: 'محمد خالد',
    items: [
      { productId: 'p8', productName: 'خزانة أرضية للحمام', productCode: 'C9', size: '80سم', color: 'بني', quantity: 1, unitPrice: 450, total: 450 },
    ],
    total: 450,
    status: 'cancelled',
    createdAt: '2025-08-10T16:20:00',
  },
  {
    id: 'o6',
    number: '1019',
    customerName: 'رامي عبد الله',
    customerId: '',
    customerPhone: '0594678901',
    customerAddress: 'طولكرم - مخيم نور شمس',
    notes: '',
    repId: 'r1',
    repName: 'أحمد محمد',
    items: [
      { productId: 'p11', productName: 'مقابس كهربائية للحمام', productCode: 'E4', size: 'مزدوجة', color: 'أبيض', quantity: 4, unitPrice: 65, total: 260 },
      { productId: 'p12', productName: 'مفتاح إضاءة حساس', productCode: 'E8', size: 'مفرد', color: 'أبيض', quantity: 3, unitPrice: 75, total: 225 },
    ],
    total: 485,
    status: 'completed',
    createdAt: '2025-08-05T13:10:00',
  },
  {
    id: 'o7',
    number: '1018',
    customerName: 'ماجد صلاح',
    customerId: '',
    customerPhone: '0593789012',
    customerAddress: 'نابلس - رفيديا',
    notes: 'توصيل سريع',
    repId: 'r3',
    repName: 'سامر علي',
    items: [
      { productId: 'p18', productName: 'ستارة حمام مقاومة للماء', productCode: 'H1', size: '200×220سم', color: 'أبيض', quantity: 2, unitPrice: 70, total: 140 },
      { productId: 'p17', productName: 'حامل ورق تواليت', productCode: 'G10', size: 'قياسي', color: 'كروم', quantity: 3, unitPrice: 30, total: 90 },
      { productId: 'p16', productName: 'رف زجاجي للحمام', productCode: 'G7', size: '60سم', color: 'شفاف', quantity: 1, unitPrice: 90, total: 90 },
    ],
    total: 320,
    status: 'pending',
    createdAt: '2025-08-22T08:30:00',
  },
  {
    id: 'o8',
    number: '1017',
    customerName: 'وليد فاروق',
    customerId: '',
    customerPhone: '0592890123',
    customerAddress: 'قلقيلية - عزون',
    notes: '',
    repId: 'r2',
    repName: 'محمد خالد',
    items: [
      { productId: 'p2', productName: 'مرآة حائط مستطيلة', productCode: 'A12', size: '90سم', color: 'فضي', quantity: 1, unitPrice: 320, total: 320 },
    ],
    total: 320,
    status: 'completed',
    createdAt: '2025-07-28T15:00:00',
  },
];

export const shopSettings: ShopSettings = {
  name: 'شركة الفجر للصناعة والتجارة',
  phones: ['0597123456', '0598234567'],
  address: 'طولكرم - شارع القدس - مجمع الفجر التجاري',
  email: 'info@alfajr-sanitary.com',
  workingHours: 'السبت - الخميس: 8:00 صباحاً - 6:00 مساءً',
  city: 'طولكرم',
};

export const heroImage = 'https://images.pexels.com/photos/6957081/pexels-photo-6957081.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
export const heroImage2 = 'https://images.pexels.com/photos/7045908/pexels-photo-7045908.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
export const heroImage3 = 'https://images.pexels.com/photos/6394530/pexels-photo-6394530.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
