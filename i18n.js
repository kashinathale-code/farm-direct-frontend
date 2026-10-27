// ============================================================================
// FARM DIRECT — MULTILINGUAL I18N SYSTEM (ENGLISH, HINDI, MARATHI)
// ============================================================================

const FD_I18N = (function () {
  'use strict';

  const STORAGE_KEY = 'fd_selected_language';
  const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English', nativeName: 'English' },
    { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', nativeName: 'मराठी' }
  ];

  // Translation Dictionaries: English (en), Hindi (hi), Marathi (mr)
  const translations = {
    en: {
      // Common & Actions
      'common.brand': 'Farm Direct',
      'common.tagline': 'Fair Agricultural Trade',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.edit': 'Edit',
      'common.delete': 'Delete',
      'common.refresh': 'Refresh',
      'common.retry': 'Retry',
      'common.loading': 'Loading...',
      'common.search': 'Search',
      'common.filter': 'Filter',
      'common.all': 'All',
      'common.close': 'Close',
      'common.back': 'Back',
      'common.home': 'Home',
      'common.logout': 'Logout',
      'common.settings': 'Settings',
      'common.profile': 'My Profile',
      'common.notifications': 'Notifications',
      'common.messages': 'Messages',
      'common.overview': 'Overview',
      'common.kg': 'kg',
      'common.per_kg': '/ kg',
      'common.currency': '₹',
      'common.available': 'available',
      'common.in_stock': 'In Stock',
      'common.low_stock': 'Low Stock',
      'common.verified_origin': 'Verified Origin',
      'common.negotiable': 'Price Negotiable',
      'common.harvest_date': 'Harvest Date',
      'common.status': 'Status',
      'common.action': 'Action',
      'common.view': 'View',
      'common.submit': 'Submit',
      'common.confirm': 'Confirm',
      'common.select_crop': 'Select Crop',
      'common.language': 'Language',

      // Navigation
      'nav.main': 'Main',
      'nav.communication': 'Communication',
      'nav.insights': 'Insights',
      'nav.account': 'Account',
      'nav.overview': 'Overview',
      'nav.my_crops': 'My Crops',
      'nav.add_crop': 'Add New Crop',
      'nav.orders': 'Orders & Fulfillment',
      'nav.bids': 'Bids & Negotiations',
      'nav.group_buy': 'Group Buying',
      'nav.analytics': 'Sales Analytics',
      'nav.traceability': 'Crop Traceability',
      'nav.fair_price': 'Fair Price & Savings',
      'nav.weather': 'Weather Forecast',
      'nav.browse_crops': 'Browse Crops',
      'nav.my_orders': 'My Orders',
      'nav.track_orders': 'Track Orders',
      'nav.price_comparison': 'Price Comparison',
      'nav.ai_assistant': 'AI Assistant',

      // Landing Page
      'landing.hero_badge': 'Direct-to-Consumer Agriculture',
      'landing.hero_title': 'Fresh from the farm, directly to your doorstep.',
      'landing.hero_subtitle': 'We connect local agricultural growers directly with consumers, restaurants, and wholesale buyers. Zero intermediary commissions, 100% price transparency, and verified harvest origin.',
      'landing.search_placeholder': 'Search fresh crops (e.g. Alphonso Mangoes, Tomatoes, Basmati Rice)...',
      'landing.browse_produce': 'Browse Produce',
      'landing.sell_crops': 'Start Selling as Farmer',
      'landing.buy_harvest': 'Buy Fresh Harvest',
      'landing.zero_commission': '0% Commission',
      'landing.direct_fair_trade': 'Direct Fair Trade',
      'landing.qr_verified': 'QR Verified',
      'landing.origin_trace': 'Tamper-Resistant Origin',
      'landing.live_negotiations': 'Live Negotiations',
      'landing.direct_bids': 'Direct Buyer-Grower Bids',
      'landing.how_it_works': 'How Farm Direct Works',
      'landing.how_it_works_subtitle': 'Transparent direct sales model built for growers and conscious buyers.',
      'landing.step1_title': '1. Farmers List Produce',
      'landing.step1_desc': 'Harvest details, transparent pricing per kg, and lot photos are directly uploaded.',
      'landing.step2_title': '2. Buyers Order or Pool',
      'landing.step2_desc': 'Order instantly at listed fair price, negotiate custom bids, or pool bulk community group orders.',
      'landing.step3_title': '3. Direct Fulfillment & Trace',
      'landing.step3_desc': 'Track order delivery status and scan QR code to inspect farm origin verification.',
      'landing.login_btn': 'Log In',
      'landing.get_started': 'Get Started',
      'landing.marketplace': 'Marketplace',
      'landing.features': 'Features',

      // Authentication
      'auth.welcome_back': 'Welcome Back',
      'auth.sign_in_tagline': 'Sign in to your Farm Direct portal',
      'auth.email_label': 'Email Address',
      'auth.email_placeholder': 'name@example.com',
      'auth.password_label': 'Password',
      'auth.password_placeholder': 'Enter your password',
      'auth.sign_in_btn': 'Sign In to Portal',
      'auth.no_account': "Don't have an account yet?",
      'auth.create_one': 'Create one here',
      'auth.create_title': 'Create Your Account',
      'auth.create_tagline': 'Join the direct agricultural trade network',
      'auth.name_label': 'Full Name',
      'auth.name_placeholder': 'e.g. Ramesh Patel',
      'auth.reg_password_placeholder': 'Minimum 6 characters',
      'auth.account_type': 'Account Type',
      'auth.select_role': 'Select Role',
      'auth.role_farmer': 'Sell Crops (Farmer)',
      'auth.role_buyer': 'Buy Crops (Buyer)',
      'auth.location_label': 'Location / Region',
      'auth.location_placeholder': 'e.g. Pune, Maharashtra',
      'auth.register_btn': 'Complete Registration',
      'auth.have_account': 'Already have an account?',
      'auth.login_here': 'Sign in here',

      // Farmer Dashboard
      'farmer.producer_portal': '🌱 Producer Portal',
      'farmer.welcome': 'Welcome back,',
      'farmer.subtitle': 'Manage your crop listings, orders, and direct sales from one centralized dashboard.',
      'farmer.add_crop_btn': '+ Add New Crop Listing',
      'farmer.quick_search_placeholder': 'Filter crops or orders...',
      'farmer.stat_crops': 'Active Crop Listings',
      'farmer.stat_stock': 'Total Stock in Inventory',
      'farmer.stat_orders': 'Total Orders Received',
      'farmer.stat_revenue': 'Gross Sales Realized',
      'farmer.my_crops_title': 'My Crop Inventory',
      'farmer.my_crops_subtitle': 'Active produce available for direct purchase and price negotiations.',
      'farmer.add_crop_title': 'Add New Harvest Listing',
      'farmer.add_crop_subtitle': 'List your harvest produce directly to retail buyers and bulk purchase groups.',
      'farmer.crop_name_label': 'Crop Name *',
      'farmer.crop_name_placeholder': 'e.g. Organic Sharbati Wheat, Alphonso Mangoes',
      'farmer.crop_category_label': 'Category *',
      'farmer.crop_price_label': 'Direct Selling Price (₹ per kg) *',
      'farmer.crop_quantity_label': 'Available Harvest Quantity (kg) *',
      'farmer.crop_desc_label': 'Crop Description',
      'farmer.crop_desc_placeholder': 'Mention farming practices, variety, freshness, packaging...',
      'farmer.harvest_date_label': 'Harvest Date',
      'farmer.bidding_label': 'Enable Custom Price Negotiations (Bids)',
      'farmer.reserve_price_label': 'Minimum Acceptable Price (₹/kg) — Kept strictly private',
      'farmer.crop_photo_label': 'Crop Photo (Optional)',
      'farmer.publish_btn': 'Publish Crop Listing',

      // Buyer Dashboard
      'buyer.marketplace_portal': '🛒 Direct Farm Marketplace',
      'buyer.welcome': 'Welcome,',
      'buyer.subtitle': 'Discover farm-fresh harvests directly from local growers with 0% middleman fees.',
      'buyer.search_placeholder': 'Search by crop name, farmer, or region...',
      'buyer.filter_all': 'All Produce',
      'buyer.filter_vegetables': 'Vegetables',
      'buyer.filter_fruits': 'Fruits',
      'buyer.filter_grains': 'Grains',
      'buyer.filter_pulses': 'Pulses',
      'buyer.filter_spices': 'Spices',
      'buyer.order_now': 'Order Now',
      'buyer.qty_placeholder': 'Qty (kg)',
      'buyer.negotiate_btn': '🤝 Negotiate Custom Price',
      'buyer.price_insights_title': 'Marketplace Price Benchmarking',
      'buyer.price_insights_subtitle': 'Compare real pricing across produce categories to identify fair rates and maximum savings.',

      // Feature 1: Fair Price Meter & Savings Calculator
      'fair_price.title': 'Fair Price Meter & Savings Calculator',
      'fair_price.subtitle': 'Evaluate your crop prices against active platform listings and calculate gross savings from eliminating middlemen.',
      'fair_price.meter_title': 'Fair Price Meter',
      'fair_price.meter_desc': 'Compares your listing price with the average of comparable active platform listings for the same crop.',
      'fair_price.select_crop_prompt': 'Select one of your crop listings to check its price benchmark:',
      'fair_price.select_crop_default': '-- Select a Listed Crop --',
      'fair_price.farmer_price': "Your Listed Price",
      'fair_price.platform_avg': "Farm Direct Benchmark",
      'fair_price.diff_label': "Price Difference",
      'fair_price.status_below': "Below platform average",
      'fair_price.status_around': "Around platform average",
      'fair_price.status_above': "Above platform average",
      'fair_price.good_deal': "Good Deal",
      'fair_price.deal_badge_text': "Good Deal (Competitive Direct Price)",
      'fair_price.below_msg': "Your price is {pct}% below the Farm Direct average.",
      'fair_price.around_msg': "Your price is within 5% of the Farm Direct average.",
      'fair_price.above_msg': "Your price is {pct}% above the Farm Direct average.",
      'fair_price.insufficient_data': "Not enough comparable listings yet",
      'fair_price.insufficient_hint': "At least 2 active listings of the same crop are required to calculate a reliable benchmark average.",
      'fair_price.scope_regional': "Regional Benchmark",
      'fair_price.scope_platform': "Platform-wide Benchmark",
      'fair_price.based_on': "Based on {count} active comparable listing(s)",
      'fair_price.refreshed_at': "Calculated at: {time}",
      'fair_price.disclaimer': "Benchmark is calculated solely from active Farm Direct platform listings. This is not an official government APMC mandi price or verified national market rate.",

      // Middleman Savings Calculator
      'calc.title': 'Middleman Savings Calculator',
      'calc.subtitle': 'Estimate additional gross revenue earned by selling directly to buyers instead of local middlemen or traditional mandis.',
      'calc.select_listing_hint': 'Prefill from an existing listing (optional):',
      'calc.crop_name': 'Crop Name',
      'calc.crop_name_placeholder': 'e.g. Wheat, Tomato, Onion',
      'calc.mandi_price': 'Local Mandi / Middleman Price (₹/kg)',
      'calc.mandi_price_placeholder': 'e.g. 20',
      'calc.direct_price': 'Proposed Direct-Selling Price (₹/kg)',
      'calc.direct_price_placeholder': 'e.g. 25',
      'calc.quantity': 'Quantity to Sell (kg)',
      'calc.quantity_placeholder': 'e.g. 500',
      'calc.results_heading': 'Estimated Savings & Additional Revenue',
      'calc.comp_price_label': 'Mandi / Middleman Price',
      'calc.proposed_price_label': 'Proposed Direct Price',
      'calc.diff_per_kg_label': 'Gross Difference per kg',
      'calc.total_diff_label': 'Estimated Additional Gross Revenue',
      'calc.pct_diff_label': 'Percentage Gain over Mandi Price',
      'calc.unfavorable_notice': 'Notice: Proposed direct price is lower than the comparison mandi price. Estimated difference is negative.',
      'calc.disclaimer': 'Financial Disclaimer: This calculation is a hypothetical estimate based strictly on the values you entered. It represents estimated gross price difference and does not account for transport, packaging, platform fees, labor, spoilage, or taxes. It does not represent guaranteed net profit.',

      // Feature 3: Weather Forecast
      'weather.card_title': 'Agricultural Weather Forecast',
      'weather.card_subtitle': 'Real-time meteorological insights to help plan harvesting, drying, irrigation, and crop protection.',
      'weather.current_temp': 'Current Temperature',
      'weather.condition': 'Weather Condition',
      'weather.min_max': 'Day Min / Max',
      'weather.precipitation': 'Precipitation Chance',
      'weather.rainfall': 'Expected Rainfall',
      'weather.wind_speed': 'Wind Speed',
      'weather.humidity': 'Relative Humidity',
      'weather.last_updated': 'Last updated: {time}',
      'weather.change_location': 'Change Location',
      'weather.detect_location': 'Use Current Location',
      'weather.search_placeholder': 'Search city or district (e.g. Nashik, Pune, Nagpur)...',
      'weather.forecast_7day': '7-Day Farming Weather Outlook',
      'weather.insights_title': 'Weather-Based Farming Insights',
      'weather.insights_disclaimer': 'Advisory Note: These rule-based suggestions are derived from standard meteorological forecast metrics. Weather conditions can change rapidly. Farmers should use their judgment and consult local Krishi Vigyan Kendra (KVK) or official agricultural department advisories.',
      'weather.rain_alert': 'Rain Alert: Significant precipitation is expected ({rain}mm / {prob}% chance). Consider postponing crop harvesting, open-yard drying, and pesticide spraying. Ensure harvested produce is stored under waterproof cover.',
      'weather.heat_alert': 'Heat Advisory: Elevated temperatures expected ({temp}°C max). Increase irrigation frequency during early morning or dusk hours to mitigate thermal stress for sensitive crops.',
      'weather.wind_alert': 'Wind Alert: High wind velocities forecast ({wind} km/h). Delay foliar sprays to prevent chemical drift and inspect staking or supports for tall crops.',
      'weather.dry_favorable': 'Favorable Work Window: Relatively dry and stable weather expected. Suitable conditions for outdoor fieldwork, harvesting, grain sorting, and transport.',
      'weather.attribution': 'Weather data by Open-Meteo',
      'weather.cached_notice': 'Cached data (updates every 45 min)',
      'weather.error': 'Unable to retrieve weather forecast at this time. Please check your internet connection or try another location.',

      // Weather Conditions (WMO codes)
      'weather_code.0': 'Clear Sky',
      'weather_code.1': 'Mainly Clear',
      'weather_code.2': 'Partly Cloudy',
      'weather_code.3': 'Overcast',
      'weather_code.45': 'Foggy',
      'weather_code.48': 'Depositing Rime Fog',
      'weather_code.51': 'Light Drizzle',
      'weather_code.53': 'Moderate Drizzle',
      'weather_code.55': 'Dense Drizzle',
      'weather_code.61': 'Slight Rain',
      'weather_code.63': 'Moderate Rain',
      'weather_code.65': 'Heavy Rain',
      'weather_code.71': 'Slight Snow',
      'weather_code.73': 'Moderate Snow',
      'weather_code.75': 'Heavy Snow',
      'weather_code.80': 'Slight Showers',
      'weather_code.81': 'Moderate Showers',
      'weather_code.82': 'Violent Showers',
      'weather_code.95': 'Thunderstorm',
      'weather_code.96': 'Thunderstorm with Slight Hail',
      'weather_code.99': 'Thunderstorm with Heavy Hail',

      // Order Statuses
      'status.pending': 'Pending',
      'status.accepted': 'Accepted',
      'status.processing': 'Processing',
      'status.shipped': 'Shipped',
      'status.delivered': 'Delivered',
      'status.cancelled': 'Cancelled',
      'status.rejected': 'Rejected',

      // Traceability
      'trace.verified_badge': '🛡️ VERIFIED DIGITAL HARVEST ORIGIN',
      'trace.loading': 'Verifying digital agricultural origin certificate...',
      'trace.harvest_date': 'Harvest Date',
      'trace.location': 'Farming Region / Location',
      'trace.farmer': 'Farmer / Producer',
      'trace.status': 'Current Marketplace Status',
      'trace.notes_title': 'Producer Origin Notes & Farming Practices',
      'trace.cert_id': 'Digital Certificate ID:',
      'trace.registered_on': 'Registered On:',
      'trace.disclaimer': 'Disclaimer: Information displayed represents farmer-self-reported agricultural origin data directly registered on the Farm Direct marketplace upon harvest.',
      'trace.sign_in_order': 'Sign In to Purchase Produce',
      'trace.print_cert': '🖨️ Print Verification Certificate',
      'trace.not_found_title': 'Certificate Not Found',
      'trace.not_found_desc': 'The requested digital traceability certificate does not match any active produce in the Farm Direct registry.',
      'trace.return_market': 'Return to Marketplace'
    },

    hi: {
      // Common & Actions
      'common.brand': 'फार्म डायरेक्ट',
      'common.tagline': 'पारदर्शी एवं निष्पक्ष कृषि व्यापार',
      'common.save': 'सहेजें',
      'common.cancel': 'रद्द करें',
      'common.edit': 'संशोधित करें',
      'common.delete': 'हटाएं',
      'common.refresh': 'ताज़ा करें',
      'common.retry': 'पुनः प्रयास करें',
      'common.loading': 'लोड हो रहा है...',
      'common.search': 'खोजें',
      'common.filter': 'फ़िल्टर',
      'common.all': 'सभी',
      'common.close': 'बंद करें',
      'common.back': 'पीछे जाएं',
      'common.home': 'होम',
      'common.logout': 'लॉग आउट',
      'common.settings': 'सेटिंग्स',
      'common.profile': 'मेरी प्रोफ़ाइल',
      'common.notifications': 'सूचनाएं',
      'common.messages': 'संदेश',
      'common.overview': 'अवलोकन',
      'common.kg': 'किग्रा',
      'common.per_kg': '/ किग्रा',
      'common.currency': '₹',
      'common.available': 'उपलब्ध',
      'common.in_stock': 'स्टॉक में उपलब्ध',
      'common.low_stock': 'कम स्टॉक',
      'common.verified_origin': 'सत्यापित खेत स्रोत',
      'common.negotiable': 'भाव मोलभाव संभव',
      'common.harvest_date': 'फसल कटाई तिथि',
      'common.status': 'स्थिति',
      'common.action': 'कार्रवाई',
      'common.view': 'देखें',
      'common.submit': 'जमा करें',
      'common.confirm': 'पुष्टि करें',
      'common.select_crop': 'फसल चुनें',
      'common.language': 'भाषा',

      // Navigation
      'nav.main': 'मुख्य',
      'nav.communication': 'संचार',
      'nav.insights': 'विश्लेषण एवं सुझाव',
      'nav.account': 'खाता',
      'nav.overview': 'डैशबोर्ड अवलोकन',
      'nav.my_crops': 'मेरी फसलें',
      'nav.add_crop': 'नई फसल जोड़ें',
      'nav.orders': 'ऑर्डर एवं आपूर्ति',
      'nav.bids': 'बोली एवं मोलभाव',
      'nav.group_buy': 'सामूहिक खरीद',
      'nav.analytics': 'बिक्री विश्लेषण',
      'nav.traceability': 'फसल पता लगाने की प्रणाली',
      'nav.fair_price': 'उचित मूल्य एवं बचत',
      'nav.weather': 'मौसम पूर्वानुमान',
      'nav.browse_crops': 'फसलें ब्राउज़ करें',
      'nav.my_orders': 'मेरे ऑर्डर',
      'nav.track_orders': 'ऑर्डर ट्रैक करें',
      'nav.price_comparison': 'मूल्य तुलना',
      'nav.ai_assistant': 'एआई सहायक',

      // Landing Page
      'landing.hero_badge': 'खेत से सीधे उपभोक्ता तक कृषि',
      'landing.hero_title': 'खेतों से ताज़ा उपज, सीधे आपके द्वार तक।',
      'landing.hero_subtitle': 'हम स्थानीय किसानों को उपभोक्ताओं, रेस्तरां और थोक खरीदारों से सीधे जोड़ते हैं। शून्य दलाली कमीशन, 100% मूल्य पारदर्शिता और सत्यापित फसल स्रोत।',
      'landing.search_placeholder': 'ताज़ा फसलें खोजें (जैसे गेहूं, टमाटर, बासमती चावल, आम)...',
      'landing.browse_produce': 'उपज देखें',
      'landing.sell_crops': 'किसान के रूप में बेचना शुरू करें',
      'landing.buy_harvest': 'ताज़ा उपज खरीदें',
      'landing.zero_commission': '0% दलाली',
      'landing.direct_fair_trade': 'सीधा निष्पक्ष व्यापार',
      'landing.qr_verified': 'क्यूआर सत्यापित',
      'landing.origin_trace': 'मूल खेत की पहचान',
      'landing.live_negotiations': 'सीधा मोलभाव',
      'landing.direct_bids': 'सीधी खरीदार-किसान बोली',
      'landing.how_it_works': 'फार्म डायरेक्ट कैसे काम करता है',
      'landing.how_it_works_subtitle': 'किसानों और जागरूक खरीदारों के लिए बनाया गया पारदर्शी सीधा व्यापार मंच।',
      'landing.step1_title': '1. किसान फसल सूचीबद्ध करते हैं',
      'landing.step1_desc': 'कटाई का विवरण, प्रति किलो पारदर्शी दर और तस्वीरें सीधे अपलोड करें।',
      'landing.step2_title': '2. खरीदार ऑर्डर या समूह खरीद करते हैं',
      'landing.step2_desc': 'सीधे उचित मूल्य पर खरीदें, कस्टम बोली लगाएं या सामूहिक रूप से थोक छूट पाएं।',
      'landing.step3_title': '3. सीधी आपूर्ति और क्यूआर सत्यापन',
      'landing.step3_desc': 'ऑर्डर की स्थिति ट्रैक करें और क्यूआर कोड स्कैन करके खेत का सत्यापन देखें।',
      'landing.login_btn': 'लॉग इन करें',
      'landing.get_started': 'शुरू करें',
      'landing.marketplace': 'मंडी / बाज़ार',
      'landing.features': 'विशेषताएं',

      // Authentication
      'auth.welcome_back': 'वापसी पर स्वागत है',
      'auth.sign_in_tagline': 'अपने फार्म डायरेक्ट खाते में लॉग इन करें',
      'auth.email_label': 'ईमेल पता',
      'auth.email_placeholder': 'name@example.com',
      'auth.password_label': 'पासवर्ड',
      'auth.password_placeholder': 'अपना पासवर्ड दर्ज करें',
      'auth.sign_in_btn': 'पोर्टल में साइन इन करें',
      'auth.no_account': 'क्या आपका खाता नहीं है?',
      'auth.create_one': 'नया खाता बनाएं',
      'auth.create_title': 'नया खाता बनाएं',
      'auth.create_tagline': 'सीधे कृषि व्यापार नेटवर्क से जुड़ें',
      'auth.name_label': 'पूरा नाम',
      'auth.name_placeholder': 'उदा. रमेश पटेल',
      'auth.reg_password_placeholder': 'कम से कम 6 अक्षर',
      'auth.account_type': 'खाता प्रकार',
      'auth.select_role': 'भूमिका चुनें',
      'auth.role_farmer': 'फसल बेचें (किसान)',
      'auth.role_buyer': 'फसल खरीदें (खरीदार)',
      'auth.location_label': 'स्थान / क्षेत्र',
      'auth.location_placeholder': 'उदा. पुणे, महाराष्ट्र',
      'auth.register_btn': 'पंजीकरण पूरा करें',
      'auth.have_account': 'क्या आपके पास पहले से खाता है?',
      'auth.login_here': 'यहाँ लॉग इन करें',

      // Farmer Dashboard
      'farmer.producer_portal': '🌱 किसान उत्पादक पोर्टल',
      'farmer.welcome': 'वापसी पर स्वागत है,',
      'farmer.subtitle': 'अपनी फसल लिस्टिंग, खरीदार ऑर्डर और सीधी बिक्री को एक ही डैशबोर्ड से प्रबंधित करें।',
      'farmer.add_crop_btn': '+ नई फसल लिस्टिंग जोड़ें',
      'farmer.quick_search_placeholder': 'फसलें या ऑर्डर खोजें...',
      'farmer.stat_crops': 'सक्रिय फसल लिस्टिंग',
      'farmer.stat_stock': 'कुल उपलब्ध स्टॉक',
      'farmer.stat_orders': 'प्राप्त कुल ऑर्डर',
      'farmer.stat_revenue': 'कुल सकल बिक्री',
      'farmer.my_crops_title': 'मेरी फसल सूची',
      'farmer.my_crops_subtitle': 'खरीदारों के लिए उपलब्ध ताज़ा फसलें एवं मोलभाव स्थिति।',
      'farmer.add_crop_title': 'नई फसल लिस्टिंग जोड़ें',
      'farmer.add_crop_subtitle': 'अपनी उपज को सीधे खुदरा और थोक खरीदारों तक पहुंचाएं।',
      'farmer.crop_name_label': 'फसल का नाम *',
      'farmer.crop_name_placeholder': 'उदा. शरबती गेहूं, अल्फांसो आम, टमाटर',
      'farmer.crop_category_label': 'श्रेणी *',
      'farmer.crop_price_label': 'सीधा बिक्री भाव (₹ प्रति किग्रा) *',
      'farmer.crop_quantity_label': 'उपलब्ध कटाई मात्रा (किग्रा) *',
      'farmer.crop_desc_label': 'फसल विवरण',
      'farmer.crop_desc_placeholder': 'खेती की पद्धति, किस्म, ताज़गी और पैकेजिंग का उल्लेख करें...',
      'farmer.harvest_date_label': 'फसल कटाई तिथि',
      'farmer.bidding_label': 'मूल्य मोलभाव (बोली) की अनुमति दें',
      'farmer.reserve_price_label': 'न्यूनतम स्वीकार्य भाव (₹/किग्रा) — पूर्णतः गोपनीय रखा जाता है',
      'farmer.crop_photo_label': 'फसल की तस्वीर (वैकल्पिक)',
      'farmer.publish_btn': 'फसल प्रकाशित करें',

      // Buyer Dashboard
      'buyer.marketplace_portal': '🛒 सीधी कृषि मंडी',
      'buyer.welcome': 'स्वागत है,',
      'buyer.subtitle': 'बिना किसी बिचौलिए के स्थानीय किसानों से सीधे ताज़ा फसलें खरीदें।',
      'buyer.search_placeholder': 'फसल का नाम, किसान या क्षेत्र खोजें...',
      'buyer.filter_all': 'सभी उपज',
      'buyer.filter_vegetables': 'सब्जियां',
      'buyer.filter_fruits': 'फल',
      'buyer.filter_grains': 'अनाज',
      'buyer.filter_pulses': 'दालें',
      'buyer.filter_spices': 'मसाले',
      'buyer.order_now': 'अभी ऑर्डर करें',
      'buyer.qty_placeholder': 'मात्रा (किग्रा)',
      'buyer.negotiate_btn': '🤝 भाव मोलभाव करें',
      'buyer.price_insights_title': 'मंडी मूल्य बेंचमार्किंग',
      'buyer.price_insights_subtitle': 'उचित दर और अधिकतम बचत के लिए सभी श्रेणियों में कीमतों की तुलना करें।',

      // Feature 1: Fair Price Meter & Savings Calculator
      'fair_price.title': 'उचित मूल्य मीटर एवं बिचौलिया बचत कैलकुलेटर',
      'fair_price.subtitle': 'सक्रिय फार्म डायरेक्ट लिस्टिंग के साथ अपनी फसलों के भाव की तुलना करें और बिचौलियों को हटाकर होने वाली सकल बचत का अनुमान लगाएं।',
      'fair_price.meter_title': 'उचित मूल्य मीटर',
      'fair_price.meter_desc': 'आपकी फसल के भाव की तुलना उसी फसल की अन्य सक्रिय फार्म डायरेक्ट लिस्टिंग के औसत भाव से करता है।',
      'fair_price.select_crop_prompt': 'मूल्य बेंचमार्क जांचने के लिए अपनी किसी फसल का चयन करें:',
      'fair_price.select_crop_default': '-- अपनी सूचीबद्ध फसल चुनें --',
      'fair_price.farmer_price': 'आपका सूचीबद्ध भाव',
      'fair_price.platform_avg': 'फार्म डायरेक्ट औसत बेंचमार्क',
      'fair_price.diff_label': 'मूल्य अंतर',
      'fair_price.status_below': 'प्लेटफ़ॉर्म औसत से कम',
      'fair_price.status_around': 'प्लेटफ़ॉर्म औसत के आसपास',
      'fair_price.status_above': 'प्लेटफ़ॉर्म औसत से अधिक',
      'fair_price.good_deal': 'शानदार डील',
      'fair_price.deal_badge_text': 'शानदार डील (प्रतिस्पर्धी सीधा भाव)',
      'fair_price.below_msg': 'आपका भाव फार्म डायरेक्ट औसत से {pct}% कम है।',
      'fair_price.around_msg': 'आपका भाव फार्म डायरेक्ट औसत के 5% के दायरे में है।',
      'fair_price.above_msg': 'आपका भाव फार्म डायरेक्ट औसत से {pct}% अधिक है।',
      'fair_price.insufficient_data': 'तुलना के लिए अभी पर्याप्त लिस्टिंग उपलब्ध नहीं हैं',
      'fair_price.insufficient_hint': 'विश्वसनीय बेंचमार्क औसत की गणना के लिए उसी फसल की कम से कम 2 सक्रिय लिस्टिंग आवश्यक हैं।',
      'fair_price.scope_regional': 'क्षेत्रीय बेंचमार्क',
      'fair_price.scope_platform': 'प्लेटफ़ॉर्म-व्यापी बेंचमार्क',
      'fair_price.based_on': '{count} सक्रिय तुलनीय लिस्टिंग पर आधारित',
      'fair_price.refreshed_at': 'गणना का समय: {time}',
      'fair_price.disclaimer': 'यह बेंचमार्क केवल फार्म डायरेक्ट के सक्रिय डेटा पर आधारित है। यह कोई आधिकारिक सरकारी एपीएमसी मंडी मूल्य या गारंटीकृत न्यूनतम समर्थन मूल्य नहीं है।',

      // Middleman Savings Calculator
      'calc.title': 'बिचौलिया बचत कैलकुलेटर',
      'calc.subtitle': 'स्थानीय आढ़तियों या बिचौलियों के बजाय सीधे खरीदारों को बेचकर मिलने वाले अनुमानित अतिरिक्त सकल अंतर की गणना करें।',
      'calc.select_listing_hint': 'अपनी मौजूदा फसल से स्वतः भरें (वैकल्पिक):',
      'calc.crop_name': 'फसल का नाम',
      'calc.crop_name_placeholder': 'उदा. गेहूं, टमाटर, प्याज',
      'calc.mandi_price': 'स्थानीय मंडी / बिचौलिया भाव (₹/किग्रा)',
      'calc.mandi_price_placeholder': 'उदा. 20',
      'calc.direct_price': 'प्रस्तावित सीधा बिक्री भाव (₹/किग्रा)',
      'calc.direct_price_placeholder': 'उदा. 25',
      'calc.quantity': 'बेची जाने वाली मात्रा (किग्रा)',
      'calc.quantity_placeholder': 'उदा. 500',
      'calc.results_heading': 'अनुमानित बचत एवं अतिरिक्त सकल राशि',
      'calc.comp_price_label': 'मंडी / बिचौलिया भाव',
      'calc.proposed_price_label': 'प्रस्तावित सीधा भाव',
      'calc.diff_per_kg_label': 'प्रति किग्रा सकल अंतर',
      'calc.total_diff_label': 'कुल मात्रा पर अनुमानित अतिरिक्त सकल राशि',
      'calc.pct_diff_label': 'मंडी भाव की तुलना में प्रतिशत लाभ',
      'calc.unfavorable_notice': 'ध्यान दें: आपका प्रस्तावित सीधा भाव तुलनात्मक मंडी भाव से कम है। अंतर ऋणात्मक (नेगेटिव) है।',
      'calc.disclaimer': 'वित्तीय स्पष्टीकरण: यह गणना आपके द्वारा दर्ज किए गए मानों पर आधारित एक काल्पनिक सकल अनुमान है। इसमें परिवहन, पैकेजिंग, प्लेटफ़ॉर्म शुल्क, तुड़ाई के बाद का नुकसान या कर शामिल नहीं हैं। इसे गारंटीकृत शुद्ध लाभ न मानें।',

      // Feature 3: Weather Forecast
      'weather.card_title': 'कृषि मौसम पूर्वानुमान',
      'weather.card_subtitle': 'फसल कटाई, सुखाने, सिंचाई और सुरक्षा के लिए रीयल-टाइम मौसम संबंधी जानकारी।',
      'weather.current_temp': 'वर्तमान तापमान',
      'weather.condition': 'मौसम की स्थिति',
      'weather.min_max': 'दिन का न्यूनतम / अधिकतम',
      'weather.precipitation': 'वर्षा की संभावना',
      'weather.rainfall': 'अपेक्षित वर्षा',
      'weather.wind_speed': 'हवा की गति',
      'weather.humidity': 'आर्द्रता (नमी)',
      'weather.last_updated': 'अंतिम अपडेट: {time}',
      'weather.change_location': 'स्थान बदलें',
      'weather.detect_location': 'मेरा वर्तमान स्थान उपयोग करें',
      'weather.search_placeholder': 'शहर या जिला खोजें (जैसे नासिक, पुणे, नागपुर)...',
      'weather.forecast_7day': '7-दिवसीय कृषि मौसम आउटलुक',
      'weather.insights_title': 'मौसम आधारित कृषि सुझाव',
      'weather.insights_disclaimer': 'सलाहकार नोट: ये नियम-आधारित सुझाव सामान्य मौसम पूर्वानुमान मेट्रिक्स पर आधारित हैं। मौसम में तेजी से बदलाव हो सकता है। कृपया अपने विवेक और स्थानीय कृषि विज्ञान केंद्र (KVK) की सलाह का उपयोग करें।',
      'weather.rain_alert': 'बारिश की चेतावनी: उल्लेखनीय वर्षा की संभावना है ({rain}मिमी / {prob}% संभावना)। फसल कटाई, खलिहान में अनाज सुखाना और कीटनाशक छिड़काव स्थगित करने पर विचार करें। कटी फसल को तिरपाल से ढकें।',
      'weather.heat_alert': 'तेज गर्मी की चेतावनी: अत्यधिक तापमान का अनुमान है (अधिकतम {temp}°C)। गर्मी के प्रति संवेदनशील फसलों को बचाने के लिए सुबह या शाम के समय सिंचाई करें।',
      'weather.wind_alert': 'तेज हवा की चेतावनी: तेज हवाएं चलने का अनुमान है ({wind} किमी/घंटा)। छिड़काव से बचें और लंबी फसलों को सहारा दें।',
      'weather.dry_favorable': 'अनुकूल कार्य अवधि: शुष्क और स्थिर मौसम का अनुमान है। खेत के काम, कटाई, छंटाई और परिवहन के लिए उपयुक्त स्थिति है।',
      'weather.attribution': 'मौसम डेटा स्रोत: Open-Meteo',
      'weather.cached_notice': 'कैश किया गया डेटा (हर 45 मिनट में अपडेट)',
      'weather.error': 'मौसम डेटा प्राप्त करने में असमर्थ। कृपया इंटरनेट जांचें या कोई अन्य स्थान चुनें।',

      // Weather Conditions (WMO codes)
      'weather_code.0': 'साफ़ आसमान',
      'weather_code.1': 'मुख्यतः साफ़',
      'weather_code.2': 'आंशिक रूप से बादल',
      'weather_code.3': 'घने बादल',
      'weather_code.45': 'कोहरा',
      'weather_code.48': 'जमा हुआ कोहरा',
      'weather_code.51': 'हल्की बूंदाबांदी',
      'weather_code.53': 'मध्यम बूंदाबांदी',
      'weather_code.55': 'तेज बूंदाबांदी',
      'weather_code.61': 'हल्की बारिश',
      'weather_code.63': 'मध्यम बारिश',
      'weather_code.65': 'भारी बारिश',
      'weather_code.71': 'हल्की बर्फबारी',
      'weather_code.73': 'मध्यम बर्फबारी',
      'weather_code.75': 'भारी बर्फबारी',
      'weather_code.80': 'हल्की वर्षा की बौछारें',
      'weather_code.81': 'मध्यम बौछारें',
      'weather_code.82': 'तूफानी बौछारें',
      'weather_code.95': 'गरज के साथ बारिश',
      'weather_code.96': 'ओलावृष्टि के साथ आंधी',
      'weather_code.99': 'भारी ओलावृष्टि व आंधी',

      // Order Statuses
      'status.pending': 'प्रतीक्षारत',
      'status.accepted': 'स्वीकृत',
      'status.processing': 'प्रक्रियाधीन',
      'status.shipped': 'भेज दिया गया',
      'status.delivered': 'वितरित (पहुंचा दिया गया)',
      'status.cancelled': 'रद्द किया गया',
      'status.rejected': 'अस्वीकृत',

      // Traceability
      'trace.verified_badge': '🛡️ सत्यापित डिजिटल फसल उत्पत्ति',
      'trace.loading': 'डिजिटल कृषि उत्पत्ति प्रमाण पत्र सत्यापित किया जा रहा है...',
      'trace.harvest_date': 'कटाई की तिथि',
      'trace.location': 'कृषि क्षेत्र / स्थान',
      'trace.farmer': 'किसान / उत्पादक',
      'trace.status': 'वर्तमान मंडी स्थिति',
      'trace.notes_title': 'उत्पादक मूल विवरण एवं कृषि पद्धतियां',
      'trace.cert_id': 'डिजिटल प्रमाण पत्र आईडी:',
      'trace.registered_on': 'पंजीकरण तिथि:',
      'trace.disclaimer': 'अस्वीकरण: प्रदर्शित जानकारी कटाई के समय फार्म डायरेक्ट बाज़ार में किसान द्वारा सीधे दर्ज किए गए फसल डेटा को दर्शाती है।',
      'trace.sign_in_order': 'उपज खरीदने के लिए साइन इन करें',
      'trace.print_cert': '🖨️ सत्यापन प्रमाण पत्र प्रिंट करें',
      'trace.not_found_title': 'प्रमाण पत्र नहीं मिला',
      'trace.not_found_desc': 'अनुरोधित डिजिटल फसल प्रमाण पत्र फार्म डायरेक्ट रजिस्ट्री में किसी सक्रिय उपज से मेल नहीं खाता है।',
      'trace.return_market': 'मंडी में वापस जाएं'
    },

    mr: {
      // Common & Actions
      'common.brand': 'फार्म डायरेक्ट',
      'common.tagline': 'थेट शेतमाल विक्री डिजिटल व्यासपीठ',
      'common.save': 'जतन करा',
      'common.cancel': 'रद्द करा',
      'common.edit': 'बदल करा',
      'common.delete': 'हटवा',
      'common.refresh': 'ताजे करा',
      'common.retry': 'पुन्हा प्रयत्न करा',
      'common.loading': 'लोड होत आहे...',
      'common.search': 'शोधा',
      'common.filter': 'फिल्टर',
      'common.all': 'सर्व',
      'common.close': 'बंद करा',
      'common.back': 'मागे जा',
      'common.home': 'मुख्यपृष्ठ',
      'common.logout': 'बाहेर पडा',
      'common.settings': 'सेटिंग्ज',
      'common.profile': 'माझी प्रोफाईल',
      'common.notifications': 'सूचना',
      'common.messages': 'संदेश',
      'common.overview': 'आढावा',
      'common.kg': 'किलो',
      'common.per_kg': '/ किलो',
      'common.currency': '₹',
      'common.available': 'उपलब्ध',
      'common.in_stock': 'साठा उपलब्ध',
      'common.low_stock': 'कमी साठा',
      'common.verified_origin': 'प्रमाणित शेतकरी मूळ',
      'common.negotiable': 'भाव वाटाघाटी शक्य',
      'common.harvest_date': 'कापणी तारीख',
      'common.status': 'स्थिती',
      'common.action': 'कृती',
      'common.view': 'पहा',
      'common.submit': 'सादर करा',
      'common.confirm': 'नक्की करा',
      'common.select_crop': 'पीक निवडा',
      'common.language': 'भाषा',

      // Navigation
      'nav.main': 'मुख्य',
      'nav.communication': 'संवाद',
      'nav.insights': 'माहिती व विश्लेषण',
      'nav.account': 'खाते',
      'nav.overview': 'डॅशबोर्ड आढावा',
      'nav.my_crops': 'माझी पिके',
      'nav.add_crop': 'नवीन पीक जोडा',
      'nav.orders': 'ऑर्डर्स व पूर्तता',
      'nav.bids': 'बोली व भाव वाटाघाटी',
      'nav.group_buy': 'सामूहिक खरेदी',
      'nav.analytics': 'विक्री विश्लेषण',
      'nav.traceability': 'पीक मूळ तपासणी',
      'nav.fair_price': 'रास्त भाव व बचत',
      'nav.weather': 'हवामान अंदाज',
      'nav.browse_crops': 'शेतीमाल पहा',
      'nav.my_orders': 'माझ्या ऑर्डर्स',
      'nav.track_orders': 'ऑर्डर ट्रॅक करा',
      'nav.price_comparison': 'भाव तुलना',
      'nav.ai_assistant': 'एआय सहाय्यक',

      // Landing Page
      'landing.hero_badge': 'शेतकऱ्यांकडून थेट ग्राहकांपर्यंत',
      'landing.hero_title': 'शेतातून थेट तुमच्या दारापर्यंत, १००% ताजी पिके.',
      'landing.hero_subtitle': 'स्थानिक शेतकरी आणि ग्राहक, हॉटेल व्यावसायिक व घाऊक खरेदीदारांना जोडणारे व्यासपीठ. शून्य दलाली, १००% पारदर्शक भाव आणि अस्सल मूळ शेतकरी खात्री.',
      'landing.search_placeholder': 'ताजी पिके शोधा (उदा. हापूस आंबा, टोमॅटो, कांदा, तांदूळ)...',
      'landing.browse_produce': 'शेतीमाल पहा',
      'landing.sell_crops': 'शेतकरी म्हणून विक्री सुरू करा',
      'landing.buy_harvest': 'ताजा शेतीमाल खरेदी करा',
      'landing.zero_commission': '०% दलाली',
      'landing.direct_fair_trade': 'थेट रास्त व्यापार',
      'landing.qr_verified': 'क्यूआर प्रमाणित',
      'landing.origin_trace': 'मूळ शेताची खात्री',
      'landing.live_negotiations': 'थेट भाव वाटाघाटी',
      'landing.direct_bids': 'शेतकरी-खरेदीदार थेट बोली',
      'landing.how_it_works': 'फार्म डायरेक्ट कसे कार्य करते',
      'landing.how_it_works_subtitle': 'शेतकरी आणि ग्राहकांसाठी बनवलेली अत्यंत सोपी व पारदर्शक पद्धत.',
      'landing.step1_title': '१. शेतकरी पिके नोंदवतात',
      'landing.step1_desc': 'कापणी तारीख, थेट दर प्रति किलो आणि शेतातील फोटो थेट अपलोड करा.',
      'landing.step2_title': '२. ग्राहक ऑर्डर किंवा गट खरेदी करतात',
      'landing.step2_desc': 'रास्त भावात लगेच खरेदी करा, वाटाघाटी करा किंवा एकत्रित मोठी ऑर्डर नोंदवा.',
      'landing.step3_title': '३. थेट डिलिव्हरी व क्यूआर तपासणी',
      'landing.step3_desc': 'ऑर्डर स्थिती पहा आणि क्यूआर कोड स्कॅन करून मूळ शेतकरी माहिती तपासा.',
      'landing.login_btn': 'लॉग इन',
      'landing.get_started': 'सुरू करा',
      'landing.marketplace': 'बाजारपेठ',
      'landing.features': 'वैशिष्ट्ये',

      // Authentication
      'auth.welcome_back': 'पुन्हा स्वागत आहे',
      'auth.sign_in_tagline': 'तुमच्या फार्म डायरेक्ट खात्यात प्रवेश करा',
      'auth.email_label': 'ईमेल पत्ता',
      'auth.email_placeholder': 'नाव@उदा.com',
      'auth.password_label': 'पासवर्ड',
      'auth.password_placeholder': 'तुमचा पासवर्ड टाका',
      'auth.sign_in_btn': 'पोर्टलमध्ये प्रवेश करा',
      'auth.no_account': 'अद्याप खाते नाही का?',
      'auth.create_one': 'नवीन खाते तयार करा',
      'auth.create_title': 'नवीन खाते उघडा',
      'auth.create_tagline': 'थेट कृषी व्यापार चळवळीत सहभागी व्हा',
      'auth.name_label': 'पूर्ण नाव',
      'auth.name_placeholder': 'उदा. रमेश पाटील',
      'auth.reg_password_placeholder': 'किमान ६ अक्षरे',
      'auth.account_type': 'खात्याचा प्रकार',
      'auth.select_role': 'भूमिका निवडा',
      'auth.role_farmer': 'पीक विका (शेतकरी)',
      'auth.role_buyer': 'पीक खरेदी करा (ग्राहक / खरेदीदार)',
      'auth.location_label': 'गाव / तालुका / जिल्हा',
      'auth.location_placeholder': 'उदा. पुणे, महाराष्ट्र',
      'auth.register_btn': 'नोंदणी पूर्ण करा',
      'auth.have_account': 'आधीच खाते आहे का?',
      'auth.login_here': 'येथे लॉग इन करा',

      // Farmer Dashboard
      'farmer.producer_portal': '🌱 शेतकरी उत्पादक पोर्टल',
      'farmer.welcome': 'पुन्हा स्वागत आहे,',
      'farmer.subtitle': 'तुमच्या पिकांची यादी, खरेदीदार ऑर्डर्स आणि थेट विक्री एकाच डॅशबोर्डवरून व्यवस्थापित करा.',
      'farmer.add_crop_btn': '+ नवीन पीक विक्रीसाठी जोडा',
      'farmer.quick_search_placeholder': 'पिके किंवा ऑर्डर्स शोधा...',
      'farmer.stat_crops': 'सक्रिय पिके',
      'farmer.stat_stock': 'एकूण उपलब्ध साठा',
      'farmer.stat_orders': 'एकूण मिळालेल्या ऑर्डर्स',
      'farmer.stat_revenue': 'एकूण झालेली विक्री',
      'farmer.my_crops_title': 'माझा शेतीमाल साठा',
      'farmer.my_crops_subtitle': 'खरेदीदारांसाठी विक्रीसाठी उपलब्ध पिके व दर तपशील.',
      'farmer.add_crop_title': 'नवीन पीक विक्रीसाठी नोंदवा',
      'farmer.add_crop_subtitle': 'तुमचा ताजा शेतीमाल थेट ग्राहक आणि व्यापारी गटांपर्यंत पोहोचवा.',
      'farmer.crop_name_label': 'पिकाचे नाव *',
      'farmer.crop_name_placeholder': 'उदा. शरबती गहू, हापूस आंबा, लाल कांदा',
      'farmer.crop_category_label': 'वर्गवारी *',
      'farmer.crop_price_label': 'थेट विक्री भाव (₹ प्रति किलो) *',
      'farmer.crop_quantity_label': 'विक्रीसाठी उपलब्ध प्रमाण (किलो) *',
      'farmer.crop_desc_label': 'पिकाचे वर्णन व वैशिष्ट्ये',
      'farmer.crop_desc_placeholder': 'सेंद्रिय पद्धत, जात, ताजेपणा, पॅकिंगबद्दल लिहा...',
      'farmer.harvest_date_label': 'कापणी तारीख',
      'farmer.bidding_label': 'भाव वाटाघाटी (बोली) सुरू ठेवा',
      'farmer.reserve_price_label': 'किमान स्वीकारार्ह भाव (₹/किलो) — पूर्णपणे गुप्त ठेवला जातो',
      'farmer.crop_photo_label': 'पिकाचा फोटो (ऐच्छिक)',
      'farmer.publish_btn': 'पीक विक्रीसाठी प्रसिद्ध करा',

      // Buyer Dashboard
      'buyer.marketplace_portal': '🛒 थेट शेतकरी बाजारपेठ',
      'buyer.welcome': 'स्वागत आहे,',
      'buyer.subtitle': 'मध्यस्थांशिवाय थेट स्थानिक शेतकऱ्यांकडून ताजा शेतीमाल खरेदी करा.',
      'buyer.search_placeholder': 'पिकाचे नाव, शेतकरी किंवा जिल्हा शोधा...',
      'buyer.filter_all': 'सर्व शेतीमाल',
      'buyer.filter_vegetables': 'भाज्या',
      'buyer.filter_fruits': 'फळे',
      'buyer.filter_grains': 'धान्य',
      'buyer.filter_pulses': 'डाळी / कडधान्ये',
      'buyer.filter_spices': 'मसाले',
      'buyer.order_now': 'आत्ता खरेदी करा',
      'buyer.qty_placeholder': 'प्रमाण (किलो)',
      'buyer.negotiate_btn': '🤝 भाव वाटाघाटी करा',
      'buyer.price_insights_title': 'बाजारपेठ भाव विश्लेषण',
      'buyer.price_insights_subtitle': 'योग्य भाव आणि बचतीची खात्री करण्यासाठी विविध पिकांच्या दरांची तुलना करा.',

      // Feature 1: Fair Price Meter & Savings Calculator
      'fair_price.title': 'रास्त भाव मीटर आणि दलाल बचत कॅल्क्युलेटर',
      'fair_price.subtitle': 'फार्म डायरेक्टवरील इतर पिकांच्या भावाशी तुलना करा आणि दलाल हटवून मिळणाऱ्या वाढीव रकमेचा अंदाज घ्या.',
      'fair_price.meter_title': 'रास्त भाव मीटर',
      'fair_price.meter_desc': 'तुमच्या पिकाच्या भावाची तुलना फार्म डायरेक्टवरील त्याच पिकाच्या इतर सक्रिय नोंदींच्या सरासरीशी करतो.',
      'fair_price.select_crop_prompt': 'भाव बेंचमार्क तपासण्यासाठी तुमच्या पिकांपैकी एक निवडा:',
      'fair_price.select_crop_default': '-- विक्रीस असलेले पीक निवडा --',
      'fair_price.farmer_price': 'तुमचा नोंदवलेला भाव',
      'fair_price.platform_avg': 'फार्म डायरेक्ट सरासरी बेंचमार्क',
      'fair_price.diff_label': 'भावातील फरक',
      'fair_price.status_below': 'प्लॅटफॉर्म सरासरीपेक्षा कमी',
      'fair_price.status_around': 'प्लॅटफॉर्म सरासरीच्या जवळपास',
      'fair_price.status_above': 'प्लॅटफॉर्म सरासरीपेक्षा जास्त',
      'fair_price.good_deal': 'उत्कृष्ट सौदा',
      'fair_price.deal_badge_text': 'उत्कृष्ट सौदा (किफायतशीर थेट दर)',
      'fair_price.below_msg': 'तुमचा भाव फार्म डायरेक्ट सरासरीपेक्षा {pct}% कमी आहे.',
      'fair_price.around_msg': 'तुमचा भाव फार्म डायरेक्ट सरासरीच्या ५% मर्यादेत आहे.',
      'fair_price.above_msg': 'तुमचा भाव फार्म डायरेक्ट सरासरीपेक्षा {pct}% जास्त आहे.',
      'fair_price.insufficient_data': 'तुलनेसाठी अजून पुरेशा नोंदी उपलब्ध नाहीत',
      'fair_price.insufficient_hint': 'विश्वसनीय सरासरी काढण्यासाठी त्याच पिकाच्या किमान २ सक्रिय नोंदी आवश्यक आहेत.',
      'fair_price.scope_regional': 'प्रादेशिक बेंचमार्क',
      'fair_price.scope_platform': 'संपूर्ण प्लॅटफॉर्म बेंचमार्क',
      'fair_price.based_on': '{count} सक्रिय तुल्य नोंदींवर आधारित',
      'fair_price.refreshed_at': 'गणना वेळ: {time}',
      'fair_price.disclaimer': 'हा बेंचमार्क केवळ फार्म डायरेक्ट प्लॅटफॉर्मवरील सक्रिय नोंदींवर आधारित आहे. हा कोणताही अधिकृत सरकारी बाजार समिती (APMC) दर किंवा हमीभाव नाही.',

      // Middleman Savings Calculator
      'calc.title': 'दलाल बचत कॅल्क्युलेटर',
      'calc.subtitle': 'स्थानिक बाजार समिती किंवा दलालांऐवजी ग्राहकांना थेट विकून मिळणाऱ्या अंदाजे वाढीव रकमेची गणना करा.',
      'calc.select_listing_hint': 'माझ्या पिकातून माहिती भरा (ऐच्छिक):',
      'calc.crop_name': 'पिकाचे नाव',
      'calc.crop_name_placeholder': 'उदा. गहू, टोमॅटो, कांदा',
      'calc.mandi_price': 'स्थानिक बाजार / दलाल भाव (₹/किलो)',
      'calc.mandi_price_placeholder': 'उदा. २०',
      'calc.direct_price': 'प्रस्तावित थेट विक्री भाव (₹/किलो)',
      'calc.direct_price_placeholder': 'उदा. २५',
      'calc.quantity': 'विक्रीचे प्रमाण (किलो)',
      'calc.quantity_placeholder': 'उदा. ५००',
      'calc.results_heading': 'अंदाजे बचत व अतिरिक्त उत्पन्न',
      'calc.comp_price_label': 'स्थानिक बाजार / दलाल भाव',
      'calc.proposed_price_label': 'प्रस्तावित थेट भाव',
      'calc.diff_per_kg_label': 'प्रति किलो सकल फरक',
      'calc.total_diff_label': 'एकूण प्रमाणावर अंदाजे अतिरिक्त रक्कम',
      'calc.pct_diff_label': 'बाजार भावापेक्षा वाढीव टक्केवारी',
      'calc.unfavorable_notice': 'सूचना: तुमचा थेट भाव बाजार भावापेक्षा कमी आहे. फरकाची रक्कम वजा (ऋणात्मक) आहे.',
      'calc.disclaimer': 'आर्थिक सूचना: ही गणना तुम्ही दिलेल्या आकडेवारीवर आधारित एक काल्पनिक सकल अंदाज आहे. यामध्ये वाहतूक, पॅकिंग, प्लॅटफॉर्म फी, नासाडी किंवा कर यांचा समावेश नाही. हा हमी नफा मानू नये.',

      // Feature 3: Weather Forecast
      'weather.card_title': 'शेती हवामान अंदाज',
      'weather.card_subtitle': 'कापणी, सुकवणे, फवारणी व संरक्षणाचे नियोजन करण्यासाठी थेट हवामान माहिती.',
      'weather.current_temp': 'सध्याचे तापमान',
      'weather.condition': 'हवामान स्थिती',
      'weather.min_max': 'किमान / कमाल तापमान',
      'weather.precipitation': 'पावसाची शक्यता',
      'weather.rainfall': 'अपेक्षित पाऊस',
      'weather.wind_speed': 'हवेचा वेग',
      'weather.humidity': 'हवेतील आर्द्रता (ओलावा)',
      'weather.last_updated': 'अपडेट वेळ: {time}',
      'weather.change_location': 'स्थान बदला',
      'weather.detect_location': 'माझे चालू स्थान वापरा',
      'weather.search_placeholder': 'तालुका किंवा जिल्हा शोधा (उदा. नाशिक, पुणे, सातारा)...',
      'weather.forecast_7day': '७ दिवसांचा शेती हवामान अंदाज',
      'weather.insights_title': 'हवामानावर आधारित शेती सल्ला',
      'weather.insights_disclaimer': 'सल्ला सूचना: हे नियम-आधारित अंदाज हवामान निकषांवरून काढलेले आहेत. हवामानात वेगाने बदल होऊ शकतात. शेतकऱ्यांनी स्थानिक कृषी विज्ञान केंद्र (KVK) किंवा कृषी विभागाचा सल्ला अवश्य घ्यावा.',
      'weather.rain_alert': 'पाऊस इशारा: लक्षणीय पावसाची शक्यता आहे ({rain}मिमी / {prob}% शक्यता). पिकांची कापणी, धान्य वाळवणे व कीटकनाशक फवारणी पुढे ढकला. काढलेले पीक ताडपत्रीने सुरक्षित झाकून ठेवा.',
      'weather.heat_alert': 'उष्णतेचा इशारा: तापमान वाढण्याची शक्यता आहे (कमाल {temp}°C). पिकांवर उष्णतेचा ताण येऊ नये म्हणून पहाटे किंवा संध्याकाळी हलके पाणी द्यावे.',
      'weather.wind_alert': 'हवेचा इशारा: जोरदार वारे वाहण्याचा अंदाज आहे ({wind} किमी/तास). औषध फवारणी टाळावी आणि फळझाडांना किंवा मांडवांना आधार द्यावा.',
      'weather.dry_favorable': 'अनुकूल हवामान: हवामान कोरडे व स्थिर राहण्याचा अंदाज आहे. शेतीची कामे, कापणी, प्रतवारी आणि वाहतुकीसाठी उत्तम स्थिती आहे.',
      'weather.attribution': 'हवामान माहिती स्रोत: Open-Meteo',
      'weather.cached_notice': 'जतन केलेली माहिती (दर ४५ मिनिटांनी अद्ययावत)',
      'weather.error': 'हवामान माहिती मिळवण्यात अडचण येत आहे. कृपया इंटरनेट तपासा किंवा दुसरे गाव/जिल्हा निवडा.',

      // Weather Conditions (WMO codes)
      'weather_code.0': 'निरभ्र आकाश',
      'weather_code.1': 'मुख्यतः स्वच्छ',
      'weather_code.2': 'अंशतः ढगाळ',
      'weather_code.3': 'पूर्ण ढगाळ',
      'weather_code.45': 'धुके',
      'weather_code.48': 'दाट धुके',
      'weather_code.51': 'हलकी रिमझिम',
      'weather_code.53': 'मध्यम रिमझिम',
      'weather_code.55': 'दाट रिमझिम पाऊस',
      'weather_code.61': 'हलका पाऊस',
      'weather_code.63': 'मध्यम पाऊस',
      'weather_code.65': 'मुसळधार पाऊस',
      'weather_code.71': 'हलका हिमवर्षाव',
      'weather_code.73': 'मध्यम हिमवर्षाव',
      'weather_code.75': 'दाट हिमवर्षाव',
      'weather_code.80': 'पावसाच्या हलक्या सरी',
      'weather_code.81': 'मध्यम सरी',
      'weather_code.82': 'जोरदार पावसाच्या सरी',
      'weather_code.95': 'विजांच्या कडकडाटासह पाऊस',
      'weather_code.96': 'गारांसह वादळी पाऊस',
      'weather_code.99': 'मुसळधार वादळ व गारपीट',

      // Order Statuses
      'status.pending': 'प्रलंबित',
      'status.accepted': 'स्वीकृत',
      'status.processing': 'प्रक्रिया सुरू',
      'status.shipped': 'रवाना झाले',
      'status.delivered': 'पोहोचवले गेले',
      'status.cancelled': 'रद्द केले',
      'status.rejected': 'नाकारले',

      // Traceability
      'trace.verified_badge': '🛡️ प्रमाणित डिजिटल शेतीमाल मूळ',
      'trace.loading': 'डिजिटल कृषी मूळ प्रमाणपत्र पडताळले जात आहे...',
      'trace.harvest_date': 'कापणी तारीख',
      'trace.location': 'शेती क्षेत्र / ठिकाण',
      'trace.farmer': 'शेतकरी / उत्पादक',
      'trace.status': 'सध्याची बाजारपेठ स्थिती',
      'trace.notes_title': 'उत्पादक शेती पद्धती व नोंदी',
      'trace.cert_id': 'डिजिटल प्रमाणपत्र ओळख:',
      'trace.registered_on': 'नोंदणी तारीख:',
      'trace.disclaimer': 'माहिती स्पष्टीकरण: दाखवलेली माहिती काढणीनंतर शेतकऱ्याने स्वतः फार्म डायरेक्टवर थेट नोंदवलेल्या तपशीलावर आधारित आहे.',
      'trace.sign_in_order': 'शेतीमाल खरेदीसाठी प्रवेश करा',
      'trace.print_cert': '🖨️ पडताळणी प्रमाणपत्र मुद्रित करा',
      'trace.not_found_title': 'प्रमाणपत्र आढळले नाही',
      'trace.not_found_desc': 'मागितलेले डिजिटल प्रमाणपत्र फार्म डायरेक्ट नोंदीतील कोणत्याही सक्रिय शेतीमालाशी जुळत नाही.',
      'trace.return_market': 'बाजारपेठेत परत जा'
    }
  };

  // Get active language or default to 'en'
  function getLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'en' || saved === 'hi' || saved === 'mr')) {
      return saved;
    }
    return 'en';
  }

  // Set active language, update document language, apply translations, and trigger custom event
  function setLanguage(lang) {
    if (!['en', 'hi', 'mr'].includes(lang)) {
      lang = 'en';
    }
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;

    // Apply translations across DOM
    applyTranslations();

    // Dispatch event so active components can re-render dynamic strings
    window.dispatchEvent(new CustomEvent('fd_language_changed', { detail: { lang } }));
  }

  // Translate key with fallback to English or provided fallback
  function t(key, params = {}, fallback = null) {
    const lang = getLanguage();
    let text = translations[lang] && translations[lang][key];

    // Fall back to English
    if (!text && translations.en && translations.en[key]) {
      text = translations.en[key];
    }

    // Fall back to given fallback or key name
    if (!text) {
      text = fallback != null ? fallback : key;
    }

    // Replace {placeholder} parameters
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(p => {
        text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
      });
    }

    return text;
  }

  // Apply translations to all elements with data-i18n attributes in the document or container
  function applyTranslations(container = document) {
    const lang = getLanguage();
    document.documentElement.lang = lang;

    // 1. Text content replacement
    container.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key, {}, el.textContent);
      }
    });

    // 2. HTML content replacement
    container.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key) {
        el.innerHTML = t(key, {}, el.innerHTML);
      }
    });

    // 3. Placeholder replacement
    container.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', t(key, {}, el.getAttribute('placeholder')));
      }
    });

    // 4. Title / Tooltip replacement
    container.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', t(key, {}, el.getAttribute('title')));
      }
    });

    // 5. Aria label replacement
    container.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) {
        el.setAttribute('aria-label', t(key, {}, el.getAttribute('aria-label')));
      }
    });

    // Update active value in any language selector elements on page
    document.querySelectorAll('.fd-language-selector').forEach(sel => {
      if (sel.value !== lang) {
        sel.value = lang;
      }
    });
  }

  // Generate HTML for the accessible Language Selector component
  function createLanguageSelectorHtml(id = 'languageSelector') {
    const current = getLanguage();
    return `
      <div class="lang-selector-wrap" title="${t('common.language', {}, 'Language')}">
        <svg class="lang-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <select id="${id}" class="fd-language-selector" aria-label="Select Language" onchange="FD_I18N.setLanguage(this.value)">
          <option value="en" ${current === 'en' ? 'selected' : ''}>English</option>
          <option value="hi" ${current === 'hi' ? 'selected' : ''}>हिन्दी (Hindi)</option>
          <option value="mr" ${current === 'mr' ? 'selected' : ''}>मराठी (Marathi)</option>
        </select>
      </div>
    `;
  }

  // Initialize immediately on DOMContentLoaded or execution
  function init() {
    const lang = getLanguage();
    document.documentElement.lang = lang;
    applyTranslations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    getLanguage,
    setLanguage,
    t,
    applyTranslations,
    createLanguageSelectorHtml,
    SUPPORTED_LANGUAGES
  };
})();

// Global backward-compatible aliases
window.FD_I18N = FD_I18N;
window.t = FD_I18N.t;
