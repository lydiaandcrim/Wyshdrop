import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
// IMPORTANT: Replace these with your actual Supabase project URL and public anon key
const supabaseUrl = 'https://nemluxhhfwegfpffpike.supabase.co'; // e.g., https://abcdefghijk.supabase.co
const supabaseAnonKey = 'sb_publishable_79L65b4HcHd9BvczzVU0xQ_BhsXsDgS'; // e.g., eyJhbGciOiJIUzI1NiI...

const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error(
    "************************************************************************************************************************\n" +
    "SUPABASE CONFIGURATION ERROR: Your Supabase URL or Anon Key appears to be empty/placeholder.\n" +
    "Please replace the placeholder values in `supabaseUrl` and `supabaseAnonKey` with your ACTUAL project credentials from the Supabase Dashboard.\n" +
    "Go to Supabase Dashboard -> Project settings -> API to find these details.\n" +
    "Without correct credentials, Supabase authentication and database interactions will NOT work.\n" +
    "************************************************************************************************************************"
  );
}

const playSound = (playerRef, soundType, soundSettings) => {
  const player = playerRef.current;
  if (typeof window.Tone === 'undefined' || !player) {
    console.warn(`Cannot play sound. Tone.js is not defined or player is null for ${soundType}.`);
    return;
  }

  const { isAllSoundEnabled, isClickSoundEnabled, isScrollSoundEnabled, isPageTransitionSoundEnabled } = soundSettings;

  if (!isAllSoundEnabled) {
    return; // Do not play any sound if master toggle is off
  }

  // Check individual sound type settings
  if (soundType === 'click' && !isClickSoundEnabled) return;
  if (soundType === 'scroll' && !isScrollSoundEnabled) return;
  if (soundType === 'pageTransition' && !isPageTransitionSoundEnabled) return;

  if (window.Tone.context.state !== 'running') {
    window.Tone.start().then(() => {
      console.log('Tone.js audio context started.');
      if (player.loaded) {
        player.start();
      } else {
        console.warn(`Sound not loaded yet for ${soundType}:`, player.url);
      }
    }).catch(e => console.error("Error starting Tone.js audio context:", e));
  } else {
    if (player.loaded) {
      player.start();
    } else {
      console.warn(`Sound not loaded yet for ${soundType}:`, player.url);
    }
  }
};

// Debounce function for scroll sound
const debounce = (func, delay) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

// Reusable ProductSection Component (used on Home page and Category pages)
const ProductSection = ({ title, onSeeMoreClick, onProductClick, onAddProductToWishlist, soundSettings, clickSoundRef, products: propProducts, showSeeMore = true }) => {
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [products, setProducts] = useState(propProducts || []); // Use propProducts if provided, otherwise fetch
  const [isLoading, setIsLoading] = useState(propProducts ? false : true); // Loading state for products

  // Fetch products from Supabase based on the section title if propProducts are not provided
  useEffect(() => {
    if (propProducts) {
      setProducts(propProducts);
      setIsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setIsLoading(true);
      let query = supabase.from('products').select('*');

      // Implement filtering/ordering based on the section title
      if (title === "TRENDING") {
        query = query.eq('category', 'Trending').order('created_at', { ascending: false }).limit(10); // Filter by 'Trending' category
      } else if (title === "Popular / Most Searched Items" || title.includes("Recommended for You")) {
        query = query.order('rating', { ascending: false }).limit(10); // Example: highest rated
      } else if (title.includes("for ")) { // Assuming "for [Contact Name]"
        // This case is handled by propProducts when used in RecommendedPage
        // If it somehow falls here, it will just fetch general products
        query = query.limit(10);
      }
      else {
  // Determine if the title is a main category or a subcategory
  // This is a simplified check. A more robust solution might involve a lookup table or a dedicated prop.
  // For now, assuming if it's not a main category title, it's a subcategory.
        const mainCategories = ["Trending", "Books", "Accessories", "DIY / Art", "Tech", "Cups / Drinks", "Stationary", "Music", "Figurines / Plushies", "Gift Cards", "Blooms"];
        if (mainCategories.includes(title)) {
          query = query.eq('category', title).limit(10); // Filter by main category name
        } else {
          query = query.eq('subcategory', title).limit(10); // Filter by subcategory name
        }
      }
      
      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching products for ${title}:`, error);
        console.log(`Supabase fetch error details for ${title}:`, error); // <--- ADD THIS LINE
      } else {
        setProducts(data);
        console.log(`Supabase fetched data for ${title}:`, data); // <--- ADD THIS LINE
      }
      setIsLoading(false);
    };

    fetchProducts();
  }, [title, propProducts]); // Re-fetch when the section title or propProducts changes

  const checkScrollArrows = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth);
    }
  }, []);

  useEffect(() => {
    checkScrollArrows(); // Check on mount
    const currentRef = scrollRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', checkScrollArrows);
      window.addEventListener('resize', checkScrollArrows); // Recheck on resize
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', checkScrollArrows);
      }
      window.removeEventListener('resize', checkScrollArrows);
    };
  }, [checkScrollArrows]);


  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      playSound(clickSoundRef, 'click', soundSettings); // Play click sound for scrolling
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      playSound(clickSoundRef, 'click', soundSettings); // Play click sound for scrolling
    }
  };

  const scrollAmount = 300; // Pixels to scroll

  return (
    <section className="mb-12 relative"> {/* Increased margin-bottom for more space between sections */}
      <div className="flex justify-between items-center mb-4 ml-4 md:ml-12"> {/* Adjusted margin */}
        {/* Formal font for section titles */}
        <h2 className="text-3xl font-bold text-[var(--primary-color)]">{title}</h2>
        {/* See More link */}
        {showSeeMore && onSeeMoreClick && (
          <a href="#" onClick={(e) => { e.preventDefault(); onSeeMoreClick(title); playSound(clickSoundRef, 'click', soundSettings); }} className="text-sm text-[var(--primary-color)] hover:underline mr-4 md:mr-12 flex items-center space-x-1 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"> {/* Added animation */}
            <span>See More</span>
          </a>
        )}
      </div>
      {/* Increased padding-bottom to pb-16 to ensure "Add to Wyshlist" button is fully visible */}
      <div ref={scrollRef} className="flex overflow-x-auto overflow-y-hidden pb-16 space-x-4 custom-scrollbar px-4 md:px-12">
        {/* Product Image Cards */}
        <div className="flex space-x-4"> {/* Added a wrapper div for consistent spacing */}
          <div className="flex space-x-4"> {/* Added a wrapper div for consistent spacing */}
            {isLoading ? (
              <div className="text-[var(--primary-color)] text-center py-4 w-full">Loading products...</div>
            ) : products.length > 0 ? (
              products.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-[240px] h-[380px] bg-[var(--box-bg-color)] rounded-lg shadow-md border-2 border-[var(--border-color)] flex flex-col items-center justify-between p-2 cursor-pointer transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"> {/* Increased height slightly to accommodate buttons */}
                  {/* Product image with adjusted height and padding */}
                  <div
                    className="w-full h-0 pb-[150%] bg-[var(--main-bg-color)] rounded-md flex flex-col items-center justify-center text-[var(--primary-color)] text-lg relative mb-2 overflow-hidden p-2"
                    onClick={() => { onProductClick(product); playSound(clickSoundRef, 'click', soundSettings); }} // Moved onClick to the div
                  >
                    <img
                      src={product.image_url || `https://placehold.co/240x360/D3A173/FFFFFF?text=No+Image+Available`}
                      alt={product.name || 'Product Image'}
                      className="absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] object-cover rounded-md"
                      onError={(e) => e.target.src = `https://placehold.co/240x360/D3A173/FFFFFF?text=Image+Load+Error`}
                    />
                    {/* Price inside the image box */}
                    <p className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded-md text-xs">${product.price}</p> {/* Adjusted price position and font size */}
                  </div>
                  {/* Container for the product title to control height and overflow */}
                  <div className="h-16 flex items-center justify-center overflow-hidden"> {/* Reduced height for title area */}
                    <h3 className={`font-semibold text-[var(--primary-color)] text-center text-base line-clamp-2`}> {/* Consistent text size, truncate to 2 lines */}
                      {product.name}
                    </h3>
                  </div>
          {/* Price and Add to Wyshlist button below */}
                  <div className="flex flex-col space-y-2 w-full px-1"> {/* Reduced space-y and px */}
                    <button
                      onClick={() => {
                        // Check if onAddProductToWishlist is provided and is a function before calling it
                        if (typeof onAddProductToWishlist === 'function') {
                          onAddProductToWishlist(product);
                        } else {
                          console.error("Error: 'onAddProductToWishlist' function is not available.");
                          alert("Wishlist functionality is currently unavailable.");
                        }
                        playSound(clickSoundRef, 'click', soundSettings);
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded-md shadow-md hover:bg-gray-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 w-full"> {/* Smaller padding and font size */}
                      Add to Wyshlist
                    </button>
                    <a
                      href={product.amazon_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playSound(clickSoundRef, 'click', soundSettings)}
                      className="px-3 py-1.5 text-sm bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 text-center w-full"
                    >
                      Go Buy <i className="fas fa-external-link-alt ml-1"></i>
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[var(--primary-color)] text-center py-4 w-full">No products found for this section.</div>
            )}
          </div>
        </div>
      </div>
      {showLeftArrow && (
        <button
          onClick={handleScrollLeft}
          className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 bg-[var(--box-bg-color)] rounded-full p-2 shadow-md hover:bg-gray-100 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          aria-label={`Scroll left for ${title} section`}
        >
          <i className="fas fa-arrow-left text-3xl text-[var(--primary-color)]"></i>
        </button>
      )}
      {showRightArrow && (
        <button
          onClick={handleScrollRight}
          className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 bg-[var(--box-bg-color)] rounded-full p-2 shadow-md hover:bg-gray-100 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          aria-label={`Scroll right for ${title} section`}
        >
          <i className="fas fa-arrow-right text-3xl text-[var(--primary-color)]"></i>
        </button>
      )}
    </section>
  );
};

// Reusable Header Component
const Header = ({ toggleSidebar, onSearchClick, onBookmarkClick, onSettingsClick, onProfileClick, onBack, currentPage, onWyshDropClick, isHeaderVisible, toggleHeaderVisibility, user, onQuizMeClick, onDonateClick, onFeedbackClick, onSignInClick, onSignUpClick, soundSettings, clickSoundRef }) => {
  // Removed showProfileDropdown state as per request

  return (
    <header className={`w-full bg-[var(--box-bg-color)] p-4 flex justify-between items-center shadow-sm rounded-b-xl transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'} fixed top-0 left-0 z-30`}>
      <div className="flex items-center space-x-2 sm:space-x-4"> {/* Adjusted space-x for mobile */}
        {/* Back Button (conditionally rendered for search/bookmarks/settings/profile/category pages) */}
        {(currentPage !== 'home' && currentPage !== 'cover' && currentPage !== 'create-account' && currentPage !== 'splash') && (
          <button
            onClick={() => { onBack(); playSound(clickSoundRef, 'click', soundSettings); }}
            aria-label="Go back"
            className="text-[var(--primary-color)] hover:text-gray-700 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            <i className="fas fa-arrow-left text-xl"></i>
          </button>
        )}
        {/* Menu Button (always rendered now) */}
        <button
          onClick={() => { toggleSidebar(); playSound(clickSoundRef, 'click', soundSettings); }}
          aria-label="Open menu"
          className="text-[var(--primary-color)] hover:text-gray-700 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
        >
          <i className="fas fa-bars text-xl"></i>
        </button>
        {/* WyshDrop Logo/Text - Now links to home */}
        <div className="flex items-center space-x-1 cursor-pointer transition-all duration-200 ease-in-out hover:scale-105 active:scale-95" onClick={() => { onWyshDropClick(); playSound(clickSoundRef, 'click', soundSettings); }}>
          {/* Use an <img> tag for the logo. Ensure this is a transparent PNG for best results. */}
          <img src="https://placehold.co/40x40/transparent/9A6E45?text=Logo" alt="WyshDrop Logo" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" /> {/* Adjusted size for mobile */}
          <h1 className="text-2xl sm:text-3xl font-handwritten text-[var(--primary-color)] flex items-center space-x-1"> {/* Adjusted font size for mobile */}
            <span>WyshDrop</span>
          </h1>
        </div>
      </div>
      <nav className="flex space-x-3 sm:space-x-6"> {/* Adjusted space-x for mobile */}
        {/* Search Icon */}
        <button aria-label="Search" className="text-[var(--primary-color)] hover:text-gray-700 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95" onClick={() => { onSearchClick(); playSound(clickSoundRef, 'click', soundSettings); }}>
          <i className="fas fa-search text-xl"></i>
        </button>
        {/* Saved Items Icon */}
        <button aria-label="Saved Items" className="text-[var(--primary-color)] hover:text-gray-700 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95" onClick={() => { onBookmarkClick(); playSound(clickSoundRef, 'click', soundSettings); }}>
          <i className="fas fa-bookmark text-xl"></i>
        </button>
        {/* Settings Icon */}
        <button aria-label="Settings" className="text-[var(--primary-color)] hover:text-gray-700 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95" onClick={() => { onSettingsClick(); playSound(clickSoundRef, 'click', soundSettings); }}>
          <i className="fas fa-cog text-xl"></i>
        </button>
        {/* User Profile Icon (no dropdown) */}
        <button aria-label="User Profile" className="text-[var(--primary-color)] hover:text-gray-700 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95" onClick={() => { onProfileClick(); playSound(clickSoundRef, 'click', soundSettings); }}>
          <i className="fas fa-user-circle text-xl"></i>
          <span className="ml-2 text-sm hidden md:inline">{user.username || 'Guest'}</span>
        </button>
        {/* Hide/Show Header Button */}
        {currentPage === 'home' && ( // Only show on home page for now
          <button
            onClick={() => { toggleHeaderVisibility(); playSound(clickSoundRef, 'click', soundSettings); }}
            aria-label={isHeaderVisible ? "Hide header" : "Show header"}
            className="text-[var(--primary-color)] hover:text-gray-700 focus:outline-none ml-4 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            <i className={`fas ${isHeaderVisible ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
          </button>
        )}
      </nav>
    </header>
  );
};

// Home Content Component
const HomeContent = ({ onSeeMoreClick, onDiscoverClick, isLoggedIn, onAboutUsClick, onProductClick, onAddProductToWishlist, soundSettings, clickSoundRef, handleCategoryClick }) => { // Added handleCategoryClick prop
  const purposeBanners = [
    "https://placehold.co/1200x400/D3A173/FFFFFF?text=Our+Purpose+Banner+1",
    "https://placehold.co/1200x400/D3A173/FFFFFF?text=Our+Purpose+Banner+2",
    "https://placehold.co/1200x400/D3A173/FFFFFF?text=Our+Purpose+Banner+3",
  ];
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex(prevIndex => (prevIndex + 1) % purposeBanners.length);
    }, 3000); // Change banner every 3 seconds

    return () => clearInterval(interval);
  }, [purposeBanners.length]);

  return (
    <>
      {/* Main Content Area */}
      {/* Adjusted padding top for fixed header and nav bar */}
      <main className="flex-grow w-full py-12 pt-[130px]">
        {/* Welcome Section (only for new users) */}
        {!isLoggedIn && (
          <section className="w-full bg-[var(--box-bg-color)] py-12 mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] text-center px-4 md:px-12"> {/* Adjusted padding */}
            <h2 className="text-4xl font-bold text-[var(--primary-color)] mb-4">Your Gifting Journey Starts Here!</h2>
            <p className="text-lg text-[var(--primary-color)] max-w-2xl mx-auto mb-4">
              Discover and share the perfect gifts with ease. Create wishlists, get personalized recommendations, and make every occasion memorable.
            </p>
            <button
              onClick={() => { onAboutUsClick(); playSound(clickSoundRef, 'click', soundSettings); }}
              className="px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
            >
              Learn More About WyshDrop
            </button>
          </section>
        )}


        {/* Animation on Our Purpose Section - Now fills the whole banner */}
        {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
        <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] overflow-hidden relative">
          {purposeBanners.map((banner, index) => (
            <img
              key={index}
              src={banner}
              alt={`WyshDrop Mission Banner ${index + 1}`}
              className={`absolute inset-0 w-full h-full object-contain rounded-lg transition-transform duration-1000 ease-in-out ${
                index === currentBannerIndex ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
              }`} // Swipe animation
              onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"} // Fallback image
              style={{ left: `${(index - currentBannerIndex) * 100}%` }} // Position for swipe effect
            />
          ))}
        </section>

        {/* All other sections now need horizontal padding */}
        <div className="w-full mx-auto"> {/* Adjusted margins to be smaller */}
          {/* Trending Section */}
          <ProductSection title="TRENDING" onSeeMoreClick={(title) => handleCategoryClick(null, title)} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />

          {/* New Sections */}
          <ProductSection title="Books" onSeeMoreClick={(title) => handleCategoryClick(null, title)} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
          <ProductSection title="Accessories" onSeeMoreClick={(title) => handleCategoryClick(null, title)} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
          <ProductSection title="DIY / Art" onSeeMoreClick={(title) => handleCategoryClick(null, title)} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
          <ProductSection title="Tech" onSeeMoreClick={(title) => handleCategoryClick(null, title)} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
          <ProductSection title="Cups / Drinks" onSeeMoreClick={(title) => handleCategoryClick(null, title)} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
          <ProductSection title="Stationary" onSeeMoreClick={(title) => handleCategoryClick(null, title)} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
          <ProductSection title="Music" onSeeMoreClick={(title) => handleCategoryClick(null, title)} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
          <ProductSection title="Figurines / Plushies" onSeeMoreClick={(title) => handleCategoryClick(null, title)} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />

          {/* Discover Section */}
          <section className="relative flex flex-col items-center justify-center py-12 bg-[var(--main-bg-color)] rounded-lg shadow-inner border-2 border-[var(--border-color)] mx-4 md:mx-12"> {/* Adjusted padding and margin */}
            <p className="text-[var(--primary-color)] text-lg mb-4 text-center">You reached the end of this page &hearts;&hearts;&hearts;</p>
            <button
              onClick={() => { onDiscoverClick(); playSound(clickSoundRef, 'click', soundSettings); }} // Added onClick to navigate to search page
              className="relative px-8 py-4 bg-[var(--button-bg-color)] text-white text-2xl font-bold rounded-full shadow-lg hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 overflow-hidden"
            >
              <span className="relative z-10">DISCOVER</span>
              {/* Subtle background effect for the button */}
              <span className="absolute inset-0 bg-gradient-to-r from-[var(--button-bg-color)] to-gray-700 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
            </button>
          </section>
        </div>
      </main>
    </>
  );
};

// Quiz Modal Component
const QuizModal = ({ isOpen, onClose, onQuizComplete, soundSettings, clickSoundRef, user, giftingContacts }) => { // Added 'user' and 'giftingContacts' prop
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [quizResults, setQuizResults] = useState('');
  const [selectedContactForGift, setSelectedContactForGift] = useState(''); // New state for selected contact
  const [saveProgressTimeout, setSaveProgressTimeout] = useState(null); // For debouncing save

  const questions = [
    {
      id: 'recipient',
      text: 'Who are you shopping for?',
      type: 'radio-with-other',
      options: ['Friend', 'Family Member', 'Partner', 'Colleague', 'Child'],
      otherPlaceholder: 'e.g., My neighbor, My pet'
    },
    {
      id: 'occasion',
      text: 'What is the occasion?',
      type: 'radio-with-other',
      options: ['Birthday', 'Anniversary', 'Holiday', 'Graduation', 'Just Because'],
      otherPlaceholder: 'e.g., Housewarming, Promotion'
    },
    {
      id: 'interests',
      text: 'What are their main interests or hobbies?',
      type: 'text', // Keeping as text for free-form input
      placeholder: 'e.g., Reading, Gaming, Cooking, Art, Outdoors'
    },
    {
      id: 'budget',
      text: 'What is your approximate budget?',
      type: 'radio', // Simple radio for budget
      options: ['Under $25', '$25 - $50', '$50 - $100', 'Over $100']
    },
    {
      id: 'personality',
      text: 'Describe their personality in a few words:',
      type: 'text', // Keeping as text for free-form input
      placeholder: 'e.g., Creative, Adventurous, Cozy, Practical, Humorous'
    }
  ];

  // --- SUPABASE INTEGRATION: Load quiz answers on open ---
  useEffect(() => {
    if (isOpen && user.id) {
      const loadQuizProgress = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('quiz_answers')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
          console.error('Error loading quiz progress:', error);
        } else if (data && data.quiz_answers) {
          setAnswers(data.quiz_answers);
          // Find the last answered question to resume from
          const lastAnsweredIndex = questions.findIndex(q => !data.quiz_answers[q.id]);
          if (lastAnsweredIndex !== -1) {
            setCurrentQuestionIndex(lastAnsweredIndex);
          } else {
            setCurrentQuestionIndex(questions.length - 1); // If all answered, go to last question
          }
        }
      };
      loadQuizProgress();
    } else if (!isOpen) {
      // Reset state when modal closes
      setCurrentQuestionIndex(0);
      setAnswers({});
      setQuizResults('');
      setIsLoading(false);
      setSelectedContactForGift('');
    }
  }, [isOpen, user.id]);

  // --- SUPABASE INTEGRATION: Debounced save of quiz answers ---
  useEffect(() => {
    if (user.id && isOpen) {
      if (saveProgressTimeout) {
        clearTimeout(saveProgressTimeout);
      }
      const timeout = setTimeout(async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ quiz_answers: answers, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving quiz progress:', error);
        } else {
          console.log('Quiz progress saved.');
        }
      }, 1000); // Save 1 second after last change
      setSaveProgressTimeout(timeout);
    }
    return () => {
      if (saveProgressTimeout) {
        clearTimeout(saveProgressTimeout);
      }
    };
  }, [answers, user.id, isOpen]);


  const handleAnswerChange = (questionId, value, isOtherInput = false) => {
    setAnswers(prev => {
      const newAnswer = { ...prev[questionId] };

      if (isOtherInput) {
        newAnswer.type = 'other';
        newAnswer.value = value;
      } else {
        newAnswer.type = 'option';
        newAnswer.value = value;
      }
      return { ...prev, [questionId]: newAnswer };
    });
  };

  const handleNext = () => {
    playSound(clickSoundRef, 'click', soundSettings); // Play click sound
    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.id];

    if (!currentAnswer || !currentAnswer.value || (currentAnswer.type === 'other' && currentAnswer.value.trim() === '')) {
      alert("Please provide an answer before proceeding."); // Simple alert for required answer
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmitQuiz();
    }
  };

  const handleSubmitQuiz = async () => {
    setIsLoading(true);
    setQuizResults(''); // Clear previous results

    // Construct prompt for LLM
    let prompt = "Generate 3-5 unique and creative gift ideas based on the following preferences, considering common product categories like Books, Accessories, Tech, DIY/Art, Cups/Drinks, Stationary, Music, Figurines/Plushies, Gift Cards, Blooms. For each idea, provide a brief reason why it's a good fit. Format the output as a numbered list.\n\n";
    Object.keys(answers).forEach(key => {
      const questionText = questions.find(q => q.id === key).text;
      const answerValue = answers[key].value;
      prompt += `${questionText}: ${answerValue}\n`;
    });

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = ""; // API key is intentionally left empty for Canvas to provide at runtime.
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      console.log("Sending quiz prompt to Gemini API:", prompt);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Gemini API call failed with status ${response.status}:`, errorBody);
        setQuizResults(`Failed to generate ideas: ${response.statusText || 'Unknown Error'}. Please try again.`);
        setIsLoading(false);
        return; // Exit early on API error
      }

      const result = await response.json();
      console.log("Gemini API response:", result);

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setQuizResults(text);
        console.log("Generated Quiz Results:", text);

        // --- SUPABASE INTEGRATION: Save quiz answers to user profile ---
        if (user.id) {
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({
              has_taken_quiz: true,
              quiz_answers: answers, // 'answers' state from the quiz
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateProfileError) {
            console.error('Error saving quiz answers to profile:', updateProfileError);
            alert('Failed to save quiz answers: ' + updateProfileError.message);
          } else {
            console.log('Quiz answers saved to profile.');
          }

          // --- SUPABASE INTEGRATION: Save generated gift ideas (potentially with contact) ---
          const { error: insertIdeasError } = await supabase
            .from('contact_gift_ideas') // Assuming this table exists for gift ideas
            .insert([
              {
                user_id: user.id,
                contact_id: selectedContactForGift || null, // Null if no contact selected
                quiz_answers_snapshot: answers,
                generated_ideas_text: text,
                created_at: new Date().toISOString()
              }
            ]);

          if (insertIdeasError) {
            console.error('Error saving generated gift ideas:', insertIdeasError);
            alert('Failed to save gift ideas: ' + insertIdeasError.message);
          } else {
            console.log('Generated gift ideas saved.');
          }
        }
        onQuizComplete(answers); // Call parent handler to update hasTakenQuiz state in App.js
      } else {
        setQuizResults("Could not generate gift ideas. Please try again.");
      }
    } catch (error) {
      console.error("Error calling Gemini API or saving quiz:", error);
      setQuizResults("Failed to generate gift ideas or save quiz. Please check your network connection or try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswerValue = answers[currentQuestion.id]?.value;
  const currentAnswerType = answers[currentQuestion.id]?.type;

  const isNextDisabled = isLoading ||
    !currentAnswerValue ||
    (currentAnswerType === 'other' && currentAnswerValue.trim() === '');


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => { onClose(); playSound(clickSoundRef, 'click', soundSettings); }}> {/* Click outside to close */}
      <div className="bg-[var(--box-bg-color)] p-6 rounded-lg shadow-lg border-2 border-[var(--border-color)] w-full max-w-lg mx-auto flex flex-col max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}> {/* Prevent click from propagating to overlay */}
        <button
          onClick={() => { onClose(); playSound(clickSoundRef, 'click', soundSettings); }}
          className="absolute top-4 right-4 text-[var(--primary-color)] hover:text-gray-700 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          aria-label="Close quiz"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
        <h2 className="text-2xl font-bold text-[var(--primary-color)] mb-4 text-center">Gift Idea Quiz ✨</h2>

        {quizResults ? (
          <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
            <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-3">Your Personalized Gift Ideas:</h3>
            <div className="prose prose-sm max-w-none text-[var(--primary-color)]">
              <p className="whitespace-pre-wrap">{quizResults}</p>
            </div>
            {user.isLoggedIn && giftingContacts.length > 0 && (
              <div className="mt-6 border-t border-[var(--border-color)] pt-4">
                <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-3">Associate with a Contact (Optional):</h3>
                <select
                  value={selectedContactForGift}
                  onChange={(e) => { setSelectedContactForGift(e.target.value); playSound(clickSoundRef, 'click', soundSettings); }}
                  className="w-full p-3 border border-gray-300 rounded-md bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                >
                  <option value="">Select a contact...</option>
                  {giftingContacts.map(contact => (
                    <option key={contact.id} value={contact.id}>{contact.contact_name}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">Selecting a contact will show these ideas in their section on the Recommended page.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-grow flex flex-col transition-all duration-500 ease-in-out transform translate-x-0" key={currentQuestionIndex}> {/* Animation key */}
            <p className="text-lg text-[var(--primary-color)] mb-4 text-center">{currentQuestion.text}</p>
            {currentQuestion.type === 'text' && (
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-md mb-4 bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                placeholder={currentQuestion.placeholder}
                value={currentAnswerValue || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              />
            )}
            {currentQuestion.type === 'radio' && (
              <div className="flex flex-col space-y-2 mb-4">
                {currentQuestion.options.map(option => (
                  <label key={option} className="inline-flex items-center text-[var(--primary-color)]">
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      value={option}
                      checked={currentAnswerValue === option}
                      onChange={() => handleAnswerChange(currentQuestion.id, option)}
                      className="form-radio text-[var(--primary-color)] h-5 w-5"
                    />
                    <span className="ml-2 text-lg">{option}</span>
                  </label>
                ))}
              </div>
            )}
            {currentQuestion.type === 'radio-with-other' && (
              <div className="flex flex-col space-y-2 mb-4">
                {currentQuestion.options.map(option => (
                  <label key={option} className="inline-flex items-center text-[var(--primary-color)]">
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      value="option"
                      checked={currentAnswerType === 'option' && currentAnswerValue === option}
                      onChange={() => handleAnswerChange(currentQuestion.id, option, false)}
                      className="form-radio text-[var(--primary-color)] h-5 w-5"
                    />
                    <span className="ml-2 text-lg">{option}</span>
                  </label>
                ))}
                <label className="inline-flex items-center text-[var(--primary-color)]">
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value="Other"
                    checked={currentAnswerType === 'other'}
                    onChange={() => handleAnswerChange(currentQuestion.id, '', true)}
                    className="form-radio text-[var(--primary-color)] h-5 w-5"
                  />
                  <span className="ml-2 text-lg">Other:</span>
                </label>
                {currentAnswerType === 'other' && (
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-md mt-2 bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                    placeholder={currentQuestion.otherPlaceholder}
                    value={currentAnswerValue || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, true)}
                  />
                )}
              </div>
            )}
            {isLoading && (
              <div className="text-center text-[var(--primary-color)] my-4">
                <i className="fas fa-spinner fa-spin mr-2"></i> Generating ideas...
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-4">
          {!quizResults && currentQuestionIndex > 0 && (
            <button
              onClick={() => { setCurrentQuestionIndex(prev => prev - 1); playSound(clickSoundRef, 'click', soundSettings); }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
            >
              Previous
            </button>
          )}
          {!quizResults && (
            <button
              onClick={handleNext}
              disabled={isNextDisabled}
              className={`px-4 py-2 rounded-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 ${
                isNextDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[var(--button-bg-color)] text-white hover:bg-opacity-90'
              } ${currentQuestionIndex === questions.length - 1 && !isNextDisabled ? 'mx-auto' : ''}`}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Get Ideas ✨' : 'Next'}
            </button>
          )}
          {quizResults && (
            <button
              onClick={() => { onClose(); playSound(clickSoundRef, 'click', soundSettings); }}
              className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 mx-auto"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Search Page Component
const SearchPage = ({ handleCategoryClick, onSeeMoreClick, onProductClick, onAddProductToWishlist, onQuizMeClick, soundSettings, clickSoundRef }) => { // Added onProductClick prop
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState('All'); // New state for budget filter

  const categoriesData = [ // Renamed to avoid conflict with `categories` variable
    { name: "Trending", icon: "fas fa-fire", subcategories: ["What's Hot Now", "Viral Picks", "New Arrivals", "TikTok Trends", "Limited Editions"] },
    { name: "Books", icon: "fas fa-book", subcategories: ["New Arrivals", "Bestsellers", "Fantasy & Sci-Fi", "Romance", "YA", "Romantacy", "Dark Romance", "Manga & Graphic Novels", "Book Club Picks", "Personal Development", "DIY books", "Non-Fiction"] },
    { name: "Accessories", icon: "fas fa-gem", subcategories: ["Jewelry", "Bags & Totes", "Hair Accessories", "Tech Accessories", "Keychains & Charms", "Nails"] },
    { name: "DIY / Art", icon: "fas fa-paint-brush", subcategories: ["Journaling & Scrapbooking", "Painting & Drawing", "Crochet & Knitting", "Jewelry Making", "Customization Kits", "Art Tech", "2D / 3D DIY", "Clay", "Legoes"] },
    { name: "Tech", icon: "fas fa-laptop", subcategories: ["Portable Audio", "Photography & Vlogging Gear", "Gaming Essentials", "Smart Gadgets", "Digital Creation Tools"] },
    { name: "Cups / Drinks", icon: "fas fa-mug-hot", subcategories: ["Tumblers & Water Bottles", "Travel Mugs", "Coffee & Tea Accessories", "Smoothie Cups", "Novelty Drinkware", "Blenders"] },
    { name: "Stationary", icon: "fas fa-pencil-alt", subcategories: ["Aesthetic Notebooks & Journals", "Pens & Markers", "Stickers & Washi Tape", "Desk Organizers", "School Essentials", "Planner Essentials", "Chargers"] },
    { name: "Music", icon: "fas fa-music", subcategories: ["Vinyl & " + "CDs", "Kpop Merch", "All-day project", "Hit Artist Artist Merch", "Headphones & Earbuds", "Portable Speakers", "Instruments & Learning"] },
    { name: "Figurines / Plushies", icon: "fas fa-teddy-bear", subcategories: ["Anime Figurines", "Pop Culture Collectibles", "Aesthetic Plushies", "Blind Boxes & Mystery Packs", "Labubu / Skullpanda", "Sanrio & Kawaii Characters"] },
    { name: "Gift Cards", icon: "fas fa-gift", subcategories: ["Digital & Entertainment", "Experience & Self-Care", "Fashion & Beauty", "Food & Drink"] },
    { name: "Blooms", icon: "fas fa-seedling", subcategories: ["Personalized & Unique", "Aesthetic-Driven Bouquets", "Cottagecore Chic / Wildflower Blends", "Bold Monochromatic / Color Pop Bouquets", "Dried & Preserved Arrangements", "Textured & Unique Blooms", "Miniature & Petite Bouquets", "Purpose-Driven Blooms", "Mood Booster Bouquets", "Self-Care & Zen Bouquets", "Celebrating Wins Bouquets", "Just Because / Friendship Blooms", "Sustainable & Long-Lasting", "Potted Plants"] },
  ];

  const budgetOptions = ['All', 'Under $25', '$25 - $50', '$50 - $100', 'Over $100'];

  const handleBudgetChange = (budget) => {
    setSelectedBudget(budget);
    playSound(clickSoundRef, 'click', soundSettings);
    // In a real app, you would trigger a product search/filter here
    console.log("Filtering by budget:", budget);
  };


  return (
    <div className="flex-grow w-full py-4 pt-[130px]"> {/* Adjusted padding top for fixed header and nav bar */}
      {/* Search Input Field and Categories Dropdown */}
      <section className="w-full mx-auto px-4 md:px-12 mb-8 mt-4 flex items-center"> {/* Adjusted padding */}
        <div className="relative flex-grow"> {/* flex-grow to make input take available space */}
          <input
            type="text"
            placeholder="Search WyshDrop..."
            className="w-full p-3 pl-10 rounded-lg shadow-md border-2 border-[var(--border-color)] bg-[var(--box-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary-color)]"></i>
        </div>

        {/* Categories Dropdown Button (for top-level categories) */}
        <div className="relative ml-4">
          <button
            onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); playSound(clickSoundRef, 'click', soundSettings); }}
            className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 flex items-center"
          >
            Categories <i className="fas fa-chevron-down ml-2"></i>
          </button>

          {showCategoryDropdown && (
            <div
              className="absolute left-0 mt-2 w-64 bg-[var(--box-bg-color)] rounded-md shadow-lg py-1 z-10 border border-[var(--border-color)]"
              onMouseLeave={() => setHoveredCategory(null)}
            >
              {categoriesData.map((category) => (
                <div
                  key={category.name}
                  className="relative"
                  onMouseEnter={() => setHoveredCategory(category.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <button className="w-full text-left px-4 py-2 text-sm text-[var(--primary-color)] hover:bg-gray-100 flex justify-between items-center transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
                    {category.name}
                    {category.subcategories && category.subcategories.length > 0 && (
                      <i className="fas fa-chevron-left text-xs ml-auto"></i>
                    )}
                  </button>
                  {hoveredCategory === category.name && category.subcategories && category.subcategories.length > 0 && (
                    <div className="absolute right-full top-0 mr-2 w-48 bg-[var(--box-bg-color)] rounded-md shadow-lg py-1 z-20 border border-[var(--border-color)]">
                      {category.subcategories.map((sub, idx) => (
                        <a
                          key={idx}
                          href="#"
                          onClick={(e) => { e.preventDefault(); onSeeMoreClick(sub); setShowCategoryDropdown(false); playSound(clickSoundRef, 'click', soundSettings); }}
                          className="block px-4 py-2 text-sm text-[var(--primary-color)] hover:bg-gray-100 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                        >
                          {sub}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New: Budget Filter Bar */}
      <section className="w-full mx-auto px-4 md:px-12 mb-8">
        <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-3">Filter by Budget:</h3>
        <div className="flex flex-wrap gap-3">
          {budgetOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleBudgetChange(option)}
              className={`px-4 py-2 rounded-full shadow-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95
                ${selectedBudget === option ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--box-bg-color)] text-[var(--primary-color)] border border-[var(--border-color)] hover:bg-gray-100'}`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      {/* Popular/Most Searched Items Carousel */}
      <div className="w-full mx-auto"> {/* Adjusted margins */}
        <ProductSection title="Popular / Most Searched Items" onSeeMoreClick={onSeeMoreClick} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
      </div>

      {/* Existing Category List with Hover Dropdowns and Quiz Me / Recommended Section */}
      <div className="w-full mx-auto px-4 md:px-12 py-12"> {/* Adjusted padding */}
        <div className="flex flex-col md:flex-row md:space-x-8">
          {/* Left Column: Category List */}
          <div className="w-full md:w-1/2 flex flex-col space-y-4 mb-8 md:mb-0">
            {categoriesData.map((category) => (
              <div
                key={category.name}
                className="relative" // Keep relative for positioning the dropdown
                onMouseEnter={() => setHoveredCategory(category.name)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <button
                  className="w-full bg-[var(--box-bg-color)] p-4 rounded-lg shadow-md border-2 border-[var(--border-color)] flex items-center space-x-4 hover:bg-gray-50 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                  onClick={() => playSound(clickSoundRef, 'click', soundSettings)} // Play sound on category button click
                >
                  <i className={`${category.icon} text-2xl text-[var(--primary-color)]`}></i>
                  <span className="text-xl font-semibold text-[var(--primary-color)]">{category.name}</span>
                  {/* Arrow for subcategories */}
                  {category.subcategories && category.subcategories.length > 0 && (
                    <i className="fas fa-chevron-down text-xl ml-auto"></i>
                  )}
                </button>
                {hoveredCategory === category.name && category.subcategories && category.subcategories.length > 0 && (
                  // Dropdown now appears below and pushes content down
                  <div className="w-full bg-[var(--box-bg-color)] rounded-b-lg shadow-lg py-1 z-10 border-x border-b border-[var(--border-color)]">
                    {category.subcategories.map((sub, idx) => (
                      <a
                        key={idx}
                        href="#"
                        onClick={(e) => { e.preventDefault(); onSeeMoreClick(sub); playSound(clickSoundRef, 'click', soundSettings); }} // Prevent default
                        className="block px-4 py-2 text-sm text-[var(--primary-color)] hover:bg-gray-100 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                      >
                        {sub}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Column: Quiz Me & Recommended Products */}
          <div className="w-full md:w-1/2 flex flex-col items-center space-y-8">
            {/* Quiz Me Section */}
            <div className="flex flex-col items-center text-center mt-8 md:mt-0"> {/* Adjusted top margin for md breakpoint */}
              <p className="text-3xl font-handwritten text-[var(--primary-color)] mb-2">QUIZ ME!</p>
              {/* Placeholder for quiz illustration */}
              <button
                onClick={() => { onQuizMeClick(); playSound(clickSoundRef, 'click', soundSettings); }}
                className="w-32 h-32 bg-[var(--button-bg-color)] text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 group"
              >
                Start Quiz ✨
              </button>
            </div>
            {/* New: Recommendation Product Carousel at the bottom of Quiz Me on Search Page */}
            <div className="w-full mt-8"> {/* Added margin-top */}
              <ProductSection title="Recommended for You" onSeeMoreClick={onSeeMoreClick} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Bookmarks Page Component
const BookmarksPage = ({ bookmarkedProducts, soundSettings, clickSoundRef }) => {
  return (
    <div className="flex-grow w-full py-4 pt-[130px]"> {/* Adjusted padding top for fixed header and nav bar */}
      {/* Banner Image Placeholder - Full width */}
      {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
      <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] relative flex items-center justify-center">
        <img
          src="https://placehold.co/1200x400/D3A173/FFFFFF?text=My+Wyshlist+Banner" // Updated placeholder image
          alt="My Wishlist Banner"
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"}
        />
        {/* Removed text overlay */}
      </section>

      {/* Bookmarked Products Grid */}
      <div className="w-full mx-auto px-4 md:px-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Adjusted padding */}
        {bookmarkedProducts.length > 0 ? (
          bookmarkedProducts.map((product) => (
            <div key={product.id} className="bg-[var(--box-bg-color)] rounded-lg shadow-md border-2 border-[var(--border-color)] p-4 flex flex-col items-center transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
              {/* Made image and card bigger */}
              <img src={product.image_url} alt={product.name} className="w-full h-56 object-cover rounded-md mb-4" onError={(e) => e.target.src = `https://placehold.co/200x200/D3A173/FFFFFF?text=${(product.name || 'Product').replace(/\s/g, '+')}+Image`} /> // Updated text
              <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-2 text-center">{product.name}</h3>
              <p className="text-lg text-gray-700 mb-2">${product.price}</p>
              <button onClick={() => playSound(clickSoundRef, 'click', soundSettings)} className="mt-auto px-6 py-2 bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
                Hint
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-xl text-[var(--primary-color)] py-12">
            Your wishlist is empty! Start adding some amazing products.
          </div>
        )}
      </div>
    </div>
  );
};

// Settings Page Component
const SettingsPage = ({ applyPalette, colorPalettes, isDarkMode, toggleDarkMode, soundSettings, updateSoundSettings, clickSoundRef }) => {
  const [hexInput, setHexInput] = useState(""); // Initialize with empty string or current primary color

  // Update hex input when primary color changes (e.e.g., when switching palettes)
  useEffect(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    setHexInput(rootStyle.getPropertyValue('--primary-color').trim());
  }, [isDarkMode]); // Only update when dark mode changes, to reflect the current primary color

  const handleHexChange = (e) => {
    setHexInput(e.target.value);
  };

  const applyHexColor = () => {
    playSound(clickSoundRef, 'click', soundSettings); // Play click sound
    // Basic validation for hex color
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexInput)) {
      // Directly set the CSS variable for primary color
      document.documentElement.style.setProperty('--primary-color', hexInput);
    } else {
      alert("Invalid hex code. Please use a format like #RRGGBB or #RGB.");
    }
  };

  const handleSoundToggle = (type) => {
    if (soundSettings.isAllSoundEnabled || type === 'all') {
      playSound(clickSoundRef, 'click', soundSettings);
    }

    // Use updateSoundSettings to ensure persistence
    updateSoundSettings(prev => { // Pass a function to updateSoundSettings
      if (type === 'all') {
        const newState = !prev.isAllSoundEnabled;
        return {
          isAllSoundEnabled: newState,
          isClickSoundEnabled: newState,
          isScrollSoundEnabled: newState,
          isPageTransitionSoundEnabled: newState,
        };
      } else {
        const newIndividualState = {
          ...prev,
          [type]: !prev[type],
        };

        const anyIndividualEnabled = newIndividualState.isClickSoundEnabled ||
                                     newIndividualState.isScrollSoundEnabled ||
                                     newIndividualState.isPageTransitionSoundEnabled;

        return {
          ...newIndividualState,
          isAllSoundEnabled: anyIndividualEnabled,
        };
      }
    });
  };


  return (
    <div className="flex-grow w-full py-4 pt-[130px]"> {/* Adjusted padding top for fixed header and nav bar */}
      {/* Banner Image Placeholder - Full width */}
      {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
      <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] relative flex items-center justify-center">
        <img
          src="https://placehold.co/1200x400/D3A173/FFFFFF?text=Settings+Banner" // Updated placeholder image
          alt="Settings Banner"
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"}
        />
        {/* Removed text overlay */}
      </section>

      <div className="w-full mx-auto px-4 md:px-12 py-12 bg-[var(--box-bg-color)] rounded-lg shadow-lg border-2 border-[var(--border-color)]"> {/* Adjusted padding */}
        <h2 className="text-3xl font-bold text-[var(--primary-color)] mb-6 text-center">App Settings</h2>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between mb-6 p-4 border-b border-[var(--border-color)]">
          <span className="text-xl font-semibold text-[var(--primary-color)]">Dark Mode</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" value="" className="sr-only peer" checked={isDarkMode} onChange={() => { toggleDarkMode(); playSound(clickSoundRef, 'click', soundSettings); }} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--primary-color)]"></div>
          </label>
        </div>

        {/* Sound Settings */}
        <div className="mb-6 p-4 border-b border-[var(--border-color)]">
          <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-4">Sound Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg text-[var(--primary-color)]">Enable All Sounds</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={soundSettings.isAllSoundEnabled} onChange={() => handleSoundToggle('all')} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--primary-color)]"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg text-[var(--primary-color)]">Click Sound</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={soundSettings.isClickSoundEnabled} onChange={() => handleSoundToggle('isClickSoundEnabled')} disabled={!soundSettings.isAllSoundEnabled && !soundSettings.isClickSoundEnabled} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--primary-color)]"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg text-[var(--primary-color)]">Scroll Sound</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={soundSettings.isScrollSoundEnabled} onChange={() => handleSoundToggle('isScrollSoundEnabled')} disabled={!soundSettings.isAllSoundEnabled && !soundSettings.isScrollSoundEnabled} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--primary-color)]"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg text-[var(--primary-color)]">Page Transition Sound</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={soundSettings.isPageTransitionSoundEnabled} onChange={() => handleSoundToggle('isPageTransitionSoundEnabled')} disabled={!soundSettings.isAllSoundEnabled && !soundSettings.isPageTransitionSoundEnabled} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--primary-color)]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Color Scheme Selection */}
        <div className="mb-6 p-4 border-b border-[var(--border-color)]">
          <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-4">Change Color Scheme</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {colorPalettes.map((palette) => (
              <button
                key={palette.name}
                className="flex flex-col items-center p-2 rounded-lg border-2 border-[var(--border-color)] hover:border-[var(--primary-color)] transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                onClick={() => { applyPalette(palette); playSound(clickSoundRef, 'click', soundSettings); }}
              >
                <div className="w-full h-12 rounded-md mb-2" style={{ backgroundColor: isDarkMode ? palette.dark.mainBg : palette.light.mainBg, border: `1px solid ${isDarkMode ? palette.dark.border : palette.light.border}` }}></div>
                <span className="text-sm font-medium text-[var(--primary-color)]">{palette.name}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col space-y-2">
            <label htmlFor="hexColor" className="block text-lg text-[var(--primary-color)]">Or enter Hex Code for Primary Color:</label>
            <input
              type="text"
              id="hexColor"
              value={hexInput}
              onChange={handleHexChange}
              placeholder="#9A6E45"
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
            />
            <button
              onClick={applyHexColor}
              className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
            >
              Apply Hex Color
            </button>
          </div>
        </div>

        {/* Other settings can go here */}
        <div className="p-4">
          <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-2">Other Settings</h3>
          <p className="text-[var(--primary-color)]">More customization options coming soon!</p>
        </div>
      </div>
    </div>
  );
};

// Feedback Modal Component
const FeedbackModal = ({ isOpen, onClose, onSubmit, onSkip, purpose, soundSettings, clickSoundRef }) => {
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const modalTitle = purpose === 'account-deletion' ? "Aw it's sad to see you go, what could we have done better." : 'Send Us Feedback';
  const textareaPlaceholder = purpose === 'account-deletion' ? "Tell us why you're deleting your account..." : "Share your thoughts or suggestions...";
  const submitButtonText = purpose === 'account-deletion' ? 'Submit Feedback' : 'Submit';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { onClose(); playSound(clickSoundRef, 'click', soundSettings); }}> {/* Click outside to close */}
      <div className="bg-[var(--box-bg-color)] p-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}> {/* Prevent click from propagating to overlay */}
        <h2 className="text-2xl font-bold text-[var(--primary-color)] mb-4 text-center">{modalTitle}</h2>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md mb-4 bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
          rows="5"
          placeholder={textareaPlaceholder}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        ></textarea>
        <div className="flex justify-between space-x-4">
          <button
            onClick={() => { onSubmit(feedback); onClose(); playSound(clickSoundRef, 'click', soundSettings); }}
            className="flex-1 px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            {submitButtonText}
          </button>
          <button
            onClick={() => { onSkip ? onSkip() : onClose(); onClose(); playSound(clickSoundRef, 'click', soundSettings); }} // If onSkip exists, call it, otherwise just close
            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            {purpose === 'account-deletion' ? 'Skip' : 'Nevermind'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Profile Page Component
const ProfilePage = ({ user, onSignOut, onAboutUsClick, giftingContacts, setGiftingContacts, soundSettings, clickSoundRef, onProductClick, onAddProductToWishlist }) => {
  const [profileImage, setProfileImage] = useState(user.profile_image_url || "https://placehold.co/150x150/D3A173/FFFFFF?text=PFP");
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [recentBookmarks, setRecentBookmarks] = useState([]); // State for bookmarks
  const [recommendedProducts, setRecommendedProducts] = useState([]); // State for recommendations

  // Update local state when user prop changes (e.g., after initial load or profile update)
  useEffect(() => {
    if (user.isLoggedIn) {
      setProfileImage(user.profile_image_url || "https://placehold.co/150x150/D3A173/FFFFFF?text=PFP");
      // Fetch recent bookmarks and recommended products for the profile page
      const fetchProfileProducts = async () => {
        if (!user.id) return;

        // Fetch Wishlist (Recent Bookmarked Items)
        const { data: wishlistData, error: wishlistError } = await supabase
          .from('wishlists')
          .select('product_id, products(*)') // Select product details via join
          .eq('user_id', user.id)
          .order('added_at', { ascending: false })
          .limit(10); // Limit to recent bookmarks

        if (wishlistError) {
          console.error('Error fetching profile wishlist:', wishlistError);
        } else {
          setRecentBookmarks(wishlistData.map(item => item.products));
        }

        // Fetch Recommended Products (general recommendations for profile)
        const { data: recData, error: recError } = await supabase
          .from('products')
          .select('*')
          .order('rating', { ascending: false }) // Example: top-rated products
          .limit(10);

        if (recError) {
          console.error('Error fetching profile recommendations:', recError);
        } else {
          setRecommendedProducts(recData);
        }
      };
      fetchProfileProducts();
    }
  }, [user]);

  const handleImageUpload = (event) => {
    playSound(clickSoundRef, 'click', soundSettings); // Play click sound
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SUPABASE INTEGRATION: Save Profile Changes (only image for now) ---
  const handleSaveChanges = async () => {
    playSound(clickSoundRef, 'click', soundSettings);
    if (!user.id) {
      alert("Please sign in to save changes.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          profile_image_url: profileImage, // If you implement image upload to storage
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to save changes: ' + error.message);
      } else {
        console.log('Profile updated successfully:', data);
        alert('Profile updated successfully!');
        // Optionally, update the global user state in App.js if needed
      }
    } catch (error) {
      console.error('Unexpected error saving profile:', error);
      alert('An unexpected error occurred.');
    }
  };

  const handleDeleteAccount = () => {
    playSound(clickSoundRef, 'click', soundSettings); // Play click sound
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackSubmit = async (feedback) => {
    console.log("Feedback submitted:", feedback);
    // --- SUPABASE INTEGRATION: Delete Account (and associated profile data via CASCADE) ---
    if (!user.id) {
      alert("No user is logged in to delete.");
      return;
    }
    try {
      // Supabase auth.signOut() will also trigger the onAuthStateChange listener
      // which will then clean up local state.
      // The profile table entry will be deleted via RLS CASCADE on auth.users delete.
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id); // Admin delete for full cleanup

      if (authError) {
        console.error('Error deleting user account:', authError);
        alert('Failed to delete account: ' + authError.message);
      } else {
        console.log("Account deleted with feedback.");
        onSignOut(); // This will log out the user and redirect to cover page
      }
    } catch (error) {
      console.error('Unexpected error during account deletion:', error);
      alert('An unexpected error occurred during account deletion.');
    }
  };

  const handleFeedbackSkip = async () => {
    console.log("Feedback skipped.");
    // --- SUPABASE INTEGRATION: Delete Account (without feedback) ---
    if (!user.id) {
      alert("No user is logged in to delete.");
      return;
    }
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (authError) {
        console.error('Error deleting user account (skipped feedback):', authError);
        alert('Failed to delete account: ' + authError.message);
      } else {
        console.log("Account deleted without feedback.");
        onSignOut();
      }
    } catch (error) {
      console.error('Unexpected error during account deletion (skipped feedback):', error);
      alert('An unexpected error occurred during account deletion.');
    }
  };

  // --- SUPABASE INTEGRATION: Add Gifting Contact ---
  const handleAddContact = async () => {
    playSound(clickSoundRef, 'click', soundSettings);
    if (!newContactName.trim() || !newContactEmail.trim()) {
      alert('Please enter both name and email for the new contact.');
      return;
    }
    if (!user.id) {
      alert("Please sign in to add contacts.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gifting_contacts')
        .insert([
          {
            user_id: user.id,
            contact_name: newContactName.trim(),
            contact_email: newContactEmail.trim(),
            created_at: new Date().toISOString()
          }
        ])
        .select() // Select the inserted row to get its ID
        .single();

      if (error) {
        console.error('Error adding contact:', error);
        alert('Failed to add contact: ' + error.message);
      } else {
        setGiftingContacts(prev => [...prev, data]); // Add the new contact with its ID from Supabase
        setNewContactName('');
        setNewContactEmail('');
        setShowAddContactForm(false);
        alert('Contact added successfully!');
      }
    } catch (error) {
      console.error('Unexpected error adding contact:', error);
      alert('An unexpected error occurred.');
    }
  };

  return (
    <div className="flex-grow w-full py-4 pt-[130px]"> {/* Adjusted padding top for fixed header and nav bar */}
      {/* Banner Image Placeholder - Full width */}
      {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
      <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] relative flex items-center justify-center">
        <img
          src="https://placehold.co/1200x400/D3A173/FFFFFF?text=My+Profile+Banner" // Updated placeholder image
          alt="My Profile Banner"
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"}
        />
        {/* Removed text overlay */}
      </section>

      <div className="w-full mx-auto px-4 md:px-12 py-12 bg-[var(--box-bg-color)] rounded-lg shadow-lg border-2 border-[var(--border-color)] flex flex-col items-center"> {/* Adjusted padding */}
        <h2 className="text-3xl font-bold text-[var(--primary-color)] mb-6 text-center">User Profile</h2>

        {!user.isLoggedIn ? (
          <div className="w-full max-w-md text-center space-y-4">
            <p className="text-lg text-[var(--primary-color)]">Please sign in to view your profile details.</p>
            {/* These buttons will be handled by the parent App component's routing */}
            <button
              onClick={() => { onSignOut(); playSound(clickSoundRef, 'click', soundSettings); }} // Re-use onSignOut for redirecting to cover/sign-in
              className="w-full px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
            >
              Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--primary-color)] mb-4">
                <img src={profileImage} alt="Profile" className="w-full h-32 object-cover" />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="profileImageUpload"
              />
              <label
                htmlFor="profileImageUpload"
                className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md cursor-pointer hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
              >
                Change Profile Picture
              </label>
            </div>

            {/* Profile Details (display only) */}
            <div className="w-full max-w-2xl mx-auto space-y-4 mb-8"> {/* Increased max-w and added grid */}
              <div>
                <label className="block text-lg font-semibold text-[var(--primary-color)] mb-1">Username:</label>
                <p className="w-full p-3 border border-gray-300 rounded-md bg-[var(--main-bg-color)] text-[var(--primary-color)]">
                  {user.username}
                </p>
              </div>
              <div>
                <label className="block text-lg font-semibold text-[var(--primary-color)] mb-1">Email:</label>
                <p className="w-full p-3 border border-gray-300 rounded-md bg-[var(--main-bg-color)] text-[var(--primary-color)]">
                  {user.email}
                </p>
              </div>
              {/* Removed password change section */}
              <div className="md:col-span-2"> {/* Make save changes button span two columns on medium screens */}
                <button onClick={handleSaveChanges} className="w-full px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
                  Save Changes
                </button>
              </div>
            </div>

            {/* Recent Bookmarked Items */}
            <div className="w-full max-w-2xl mx-auto mb-8">
              <ProductSection
                title="Recent Bookmarked Items"
                products={recentBookmarks} // Pass fetched bookmarks
                onProductClick={onProductClick}
                onAddProductToWishlist={onAddProductToWishlist}
                soundSettings={soundSettings}
                clickSoundRef={clickSoundRef}
                showSeeMore={false} // No "See More" for this section
              />
            </div>

            {/* Gifting Contacts */}
            <div className="w-full max-w-2xl mx-auto mb-8"> {/* Increased max-w */}
              <h3 className="text-2xl font-bold text-[var(--primary-color)] mb-4">Gifting Contacts</h3>
              {giftingContacts.length > 0 ? (
                <ul className="space-y-2 mb-4">
                  {giftingContacts.map(contact => (
                    <li key={contact.id} className="flex justify-between items-center bg-[var(--main-bg-color)] p-3 rounded-md border border-[var(--border-color)] transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
                      <span className="text-[var(--primary-color)] font-medium">{contact.contact_name}</span>
                      <span className="text-sm text-gray-500">{contact.contact_email}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--primary-color)] mb-4 text-center">No gifting contacts added yet.</p>
              )}
              {showAddContactForm ? (
                <div className="space-y-3 p-4 bg-[var(--main-bg-color)] rounded-md border border-[var(--border-color)]">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-[var(--box-bg-color)] text-[var(--primary-color)]"
                  />
                  <input
                    type="email"
                    placeholder="Contact Email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-[var(--box-bg-color)] text-[var(--primary-color)]"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleAddContact}
                      className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90"
                    >
                      Add Contact
                    </button>
                    <button
                      onClick={() => { setShowAddContactForm(false); playSound(clickSoundRef, 'click', soundSettings); }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setShowAddContactForm(true); playSound(clickSoundRef, 'click', soundSettings); }}
                  className="mt-4 px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                >
                  Add New Contact
                </button>
              )}
            </div>

            {/* Recommended Products */}
            <div className="w-full max-w-2xl mx-auto mb-8">
              <ProductSection
                title="Recommended Products"
                products={recommendedProducts} // Pass fetched recommendations
                onProductClick={onProductClick}
                onAddProductToWishlist={onAddProductToWishlist}
                soundSettings={soundSettings}
                clickSoundRef={clickSoundRef}
                showSeeMore={false} // No "See More" for this section
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Recommendations are based on your quiz results and search history. Your privacy is important to us.
              </p>
            </div>

            {/* Sign Out and Delete Account */}
            <div className="w-full max-w-2xl mx-auto flex flex-col space-y-4 mt-8">
              <button
                onClick={() => { onSignOut(); playSound(clickSoundRef, 'click', soundSettings); }}
                className="w-full px-6 py-3 bg-red-500 text-white font-bold rounded-md shadow-md hover:bg-red-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
              >
                Sign Out
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full px-6 py-3 bg-gray-700 text-white font-bold rounded-md shadow-md hover:bg-gray-800 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
              >
                Delete Account
              </button>
            </div>
          </>
        )}
      </div>

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmit={handleFeedbackSubmit}
        onSkip={handleFeedbackSkip}
        purpose="account-deletion"
        soundSettings={soundSettings}
        clickSoundRef={clickSoundRef}
      />
    </div>
  );
};

// Generic Page Component for sidebar items
const GenericPage = ({ title, content, soundSettings, clickSoundRef }) => {
  return (
    <div className="flex-grow w-full py-4 pt-[130px]"> {/* Adjusted padding top for fixed header and nav bar */}
      {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
      <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] relative flex items-center justify-center">
        <img
          src={`https://placehold.co/1200x400/D3A173/FFFFFF?text=${title.replace(/\s/g, '+')}+Banner`} // Dynamic placeholder
          alt={`${title} Banner`}
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"}
        />
        {/* Removed text overlay */}
      </section>
      <div className="w-full mx-auto px-4 md:px-12 py-12 bg-[var(--box-bg-color)] rounded-lg shadow-lg border-2 border-[var(--border-color)]"> {/* Adjusted padding */}
        <h2 className="text-3xl font-bold text-[var(--primary-color)] mb-6 text-center">{title}</h2>
        {/* Render content using dangerouslySetInnerHTML to allow for basic HTML/Markdown formatting */}
        <div className="text-[var(--primary-color)] text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: content }}></div>
      </div>
    </div>
  );
};

// New Subcategory Page Component
const SubcategoryPage = ({ subcategoryName, onProductClick, onAddProductToWishlist, soundSettings, clickSoundRef }) => { // Added onProductClick prop
  const [isLoading, setIsLoading] = useState(true);
  const [subcategoryProducts, setSubcategoryProducts] = useState([]); // State for products

  // --- SUPABASE INTEGRATION: Fetch products for subcategory ---
  useEffect(() => {
    const fetchSubcategoryProducts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('subcategory', subcategoryName) // Filter by subcategory name
        .limit(20); // Limit results for performance

      if (error) {
        console.error(`Error fetching products for ${subcategoryName}:`, error);
      } else {
        setSubcategoryProducts(data ? data.filter(p => p && p.id && p.name && p.image_url && p.price) : []);
      }
      setIsLoading(false);
    };

    fetchSubcategoryProducts();
  }, [subcategoryName]);

  return (
    <div className="flex-grow w-full py-4 pt-[130px]">
      {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
      <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] relative flex items-center justify-center">
        <img
          src={`https://placehold.co/1200x400/D3A173/FFFFFF?text=${subcategoryName.replace(/\s/g, '+')}+Banner`}
          alt={`${subcategoryName} Banner`}
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"}
        />
        {/* Removed text overlay */}
      </section>
      <div className="w-full mx-auto px-4 md:px-12"> {/* Adjusted padding */}
        {isLoading ? (
          <div className="text-center text-xl text-[var(--primary-color)]">Loading products...</div>
        ) : subcategoryProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"> {/* Changed to 4 columns on large screens, reduced gap for tighter fit */}
            {subcategoryProducts.map((product) => (
              <div key={product.id} className="bg-[var(--box-bg-color)] rounded-lg shadow-md border-2 border-[var(--border-color)] p-2 cursor-pointer transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"> {/* Reduced overall product box padding to p-2 */}
                <div className="w-full h-0 pb-[150%] bg-[var(--main-bg-color)] rounded-md flex flex-col items-center justify-center text-[var(--primary-color)] text-lg relative mb-2 overflow-hidden p-2"> {/* Added p-2 for inner image padding, adjusted mb */}
                  <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover rounded-md" onError={(e) => e.target.src = `https://placehold.co/240x360/D3A173/FFFFFF?text=${(product.name || 'Product').replace(/\s/g, '+')}+Image+Load+Error`} /> {/* Updated placeholder text */}
                  <p className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded-md text-xs">${product.price}</p> {/* Adjusted price position and font size */}
                </div>
                <h3 className="text-base font-semibold text-[var(--primary-color)] text-center mb-1 line-clamp-2">{product.name}</h3> {/* Smaller font size, added line-clamp */}
                <div className="flex flex-col space-y-2 w-full px-1"> {/* Smaller space-y and px */}
                  <button
                    onClick={() => { onAddProductToWishlist(product); playSound(clickSoundRef, 'click', soundSettings); }}
                    className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded-md shadow-md hover:bg-gray-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 w-full"> {/* Smaller padding and font size */}
                    Add to Wyshlist
                  </button>
                  <a
                    href={product.amazon_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playSound(clickSoundRef, 'click', soundSettings)}
                    className="px-3 py-1.5 text-sm bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 text-center w-full"
                  >
                    Go Buy <i className="fas fa-external-link-alt ml-1"></i>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-xl text-[var(--primary-color)]">No products found for this subcategory.</div>
        )}
      </div>
    </div>
  );
};


// New Category Page Component
const CategoryPage = ({ categoryName, onSeeMoreClick, onProductClick, onAddProductToWishlist, soundSettings, clickSoundRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [categoryProducts, setCategoryProducts] = useState([]);

  // --- SUPABASE INTEGRATION: Fetch products for the main category ---
  useEffect(() => {
    const fetchCategoryProducts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', categoryName) // Filter by main category name
        .limit(50); // Fetch a reasonable number, adjust as needed

      if (error) {
        console.error(`Error fetching products for category ${categoryName}:`, error);
      } else {
        setCategoryProducts(data ? data.filter(p => p && p.id && p.name && p.image_url && p.price) : []);
      }
      setIsLoading(false);
    };

    fetchCategoryProducts();
  }, [categoryName]); // Re-fetch when categoryName changes

  // Define subcategories based on the main category
  const getSubcategories = (name) => {
    switch (name) {
      case "Trending":
        return ["What's Hot Now", "Viral Picks", "New Arrivals", "TikTok Trends", "Limited Editions"];
      case "Books":
        return ["New Arrivals", "Bestsellers", "Fantasy & Sci-Fi", "Romance", "YA", "Romantacy", "Dark Romance", "Manga & Graphic Novels", "Book Club Picks", "Personal Development", "DIY books", "Non-Fiction"];
      case "Accessories":
        return ["Jewelry", "Bags & Totes", "Hair Accessories", "Tech Accessories", "Keychains & Charms", "Nails"];
      case "DIY / Art":
        return ["Journaling & Scrapbooking", "Painting & Drawing", "Crochet & Knitting", "Jewelry Making", "Customization Kits", "Art Tech", "2D / 3D DIY", "Clay", "Legoes"];
      case "Tech":
        return ["Portable Audio", "Photography & Vlogging Gear", "Gaming Essentials", "Smart Gadgets", "Digital Creation Tools"];
      case "Cups / Drinks":
        return ["Tumblers & Water Bottles", "Travel Mugs", "Coffee & Tea Accessories", "Smoothie Cups", "Novelty Drinkware", "Blenders"];
      case "Stationary":
        return ["Aesthetic Notebooks & Journals", "Pens & Markers", "Stickers & Washi Tape", "Desk Organizers", "School Essentials", "Planner Essentials", "Chargers"];
      case "Music":
        return ["Vinyl & " + "CDs", "Kpop Merch", "All-day project", "Hit Artist Merch", "Headphones & Earbuds", "Portable Speakers", "Instruments & Learning"];
      case "Figurines / Plushies":
        return ["Anime Figurines", "Pop Culture Collectibles", "Aesthetic Plushies", "Blind Boxes & Mystery Packs", "Labubu / Skullpanda", "Sanrio & Kawaii Characters"];
      case "Gift Cards":
        return ["Digital & Entertainment", "Experience & Self-Care", "Fashion & Beauty", "Food & Drink"];
      case "Blooms":
        return ["Personalized & Unique", "Aesthetic-Driven Bouquets", "Cottagecore Chic / Wildflower Blends", "Bold Monochromatic / Color Pop Bouquets", "Dried & Preserved Arrangements", "Textured & Unique Blooms", "Miniature & Petite Bouquets", "Purpose-Driven Blooms", "Mood Booster Bouquets", "Self-Care & Zen Bouquets", "Celebrating Wins Bouquets", "Just Because / Friendship Blooms", "Sustainable & Long-Lasting", "Potted Plants"];
      default:
        return [`Popular ${name}`, `New ${name} Arrivals`, `${name} Essentials`];
    }
  };

  const subcategories = getSubcategories(categoryName);

  return (
    <div className="flex-grow w-full py-4 pt-[130px]"> {/* Adjusted padding top for fixed header and nav bar */}
      {/* Banner Image Placeholder - Full width */}
      {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
      <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] relative flex items-center justify-center">
        <img
          src={`https://placehold.co/1200x400/D3A173/FFFFFF?text=${categoryName.replace(/\s/g, '+')}+Banner`} // Dynamic placeholder
          alt={`${categoryName} Banner`}
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"}
        />
        {/* Removed text overlay */}
      </section>

      <div className="w-full mx-auto px-4 md:px-12"> {/* Adjusted margins and added padding */}

        {/* Subcategory Sections */}
        <h2 className="text-3xl font-bold text-[var(--primary-color)] mb-6 text-center">Explore Subcategories</h2>
        {subcategories.map((sub, index) => (
          // Pass handleSubcategoryClick to ProductSection for subcategories
          <ProductSection key={index} title={sub} onSeeMoreClick={onSeeMoreClick} onProductClick={onProductClick} onAddProductToWishlist={onAddProductToWishlist} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
        ))}
      </div>
    </div>
  );
};

// New Hint Modal Component
const HintModal = ({ isOpen, onClose, product, giftingContacts, setGiftingContacts, soundSettings, clickSoundRef, user }) => { // Added user prop
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedContacts([]);
      setShowAddContactForm(false);
      setNewContactName('');
      setNewContactEmail('');
      setAgreedToTerms(false);
    }
  }, [isOpen]);

  const handleContactToggle = (contactId) => {
    playSound(clickSoundRef, 'click', soundSettings); // Play click sound
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // --- SUPABASE INTEGRATION: Add Gifting Contact from Hint Modal ---
  const handleAddContact = async () => {
    playSound(clickSoundRef, 'click', soundSettings); // Play click sound
    if (!newContactName.trim() || !newContactEmail.trim()) {
      alert('Please enter both name and email for the new contact.');
      return;
    }
    if (!user.id) {
      alert("Please sign in to add contacts.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gifting_contacts')
        .insert([
          {
            user_id: user.id,
            contact_name: newContactName.trim(),
            contact_email: newContactEmail.trim(),
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding contact:', error);
        alert('Failed to add contact: ' + error.message);
      } else {
        setGiftingContacts(prev => [...prev, data]);
        setNewContactName('');
        setNewContactEmail('');
        setShowAddContactForm(false);
        setSelectedContacts(prev => [...prev, data.id]); // Automatically select the new contact
        alert('Contact added successfully!');
      }
    } catch (error) {
      console.error('Unexpected error adding contact:', error);
      alert('An unexpected error occurred.');
    }
  };

  const handleSendHint = async () => {
    playSound(clickSoundRef, 'click', soundSettings); // Play click sound
    if (!agreedToTerms) {
      alert('Please agree to the Hinting Terms & Conditions.');
      return;
    }
    if (selectedContacts.length === 0) {
      alert('Please select at least one contact to send the hint to.');
      return;
    }

    const contactsToSend = giftingContacts.filter(contact => selectedContacts.includes(contact.id));
    try {
  // 1. Record the hint in your Supabase database
  // You'll need a table, e.g., 'sent_hints', with columns like:
  // id (PK), user_id (FK to profiles), product_id (FK to products),
  // recipient_contact_id (FK to gifting_contacts), sent_at, status (e.g., 'sent', 'failed')

  const hintRecords = contactsToSend.map(contact => ({
    user_id: user.id,
    product_id: product.id,
    recipient_contact_id: contact.id,
    sent_at: new Date().toISOString(),
    status: 'pending', // Initial status, will be updated after email attempt
    // You might also want to store the product name and recipient name for easier lookup
    product_name: product.name,
    recipient_name: contact.contact_name,
    recipient_email: contact.contact_email,
  }));

  const { data: insertedHints, error: insertError } = await supabase
    .from('sent_hints')
    .insert(hintRecords)
    .select();

  if (insertError) {
    console.error('Error recording hint in database:', insertError);
    alert('Failed to record hint: ' + insertError.message);
    return;
  }
  console.log('Hints recorded in database:', insertedHints);

  // 2. Call a Supabase Edge Function (or similar backend) to send the email
  // This is a placeholder. You would need to deploy a Supabase Edge Function
  // that takes the product and contact details, and uses an email service (e.g., SendGrid, Nodemailer)
  // to send the actual email.
  const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-hint-email', {
    body: {
      product: product,
      recipients: contactsToSend,
      sender: {
        username: user.username,
        email: user.email,
      },
    },
  });

  if (emailError) {
    console.error('Error sending hint email via Edge Function:', emailError);
    alert('Failed to send hint email: ' + emailError.message);
    // Optionally update the status of the recorded hints to 'failed'
    await supabase.from('sent_hints').update({ status: 'failed' }).in('id', insertedHints.map(h => h.id));
  } else {
    console.log('Hint emails sent successfully:', emailResponse);
    alert(`Hint for "${product.name}" sent to selected contacts!`);
    // Update the status of the recorded hints to 'sent'
    await supabase.from('sent_hints').update({ status: 'sent' }).in('id', insertedHints.map(h => h.id));
  }

  onClose(); // Close the modal only after successful operations
} catch (error) {
  console.error("An unexpected error occurred while sending hint:", error);
  alert("An unexpected error occurred. Please try again.");
}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { onClose(); playSound(clickSoundRef, 'click', soundSettings); }}>
      <div className="bg-[var(--box-bg-color)] p-6 rounded-lg shadow-lg border-2 border-[var(--border-color)] w-full max-w-md mx-auto flex flex-col max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-[var(--primary-color)] mb-4 text-center">Send a Hint for "{product.name}"</h2>

        {giftingContacts.length === 0 && !showAddContactForm ? (
          <div className="text-center py-4">
            <p className="text-[var(--primary-color)] mb-4">You don't have any hinting contacts yet.</p>
            <button
              onClick={() => { setShowAddContactForm(true); playSound(clickSoundRef, 'click', soundSettings); }}
              className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
            >
              Add New Contact
            </button>
          </div>
        ) : (
          <>
            {showAddContactForm ? (
              <div className="space-y-3 p-4 bg-[var(--main-bg-color)] rounded-md border border-[var(--border-color)] mb-4">
                <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-2">Add New Contact</h3>
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-[var(--box-bg-color)] text-[var(--primary-color)]"
                />
                <input
                  type="email"
                  placeholder="Contact Email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-[var(--box-bg-color)] text-[var(--primary-color)]"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleAddContact}
                    className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90"
                  >
                    Add Contact
                  </button>
                  <button
                    onClick={() => { setShowAddContactForm(false); playSound(clickSoundRef, 'click', soundSettings); }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-3">Select Contacts:</h3>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-2 border border-[var(--border-color)] rounded-md mb-4">
                  {giftingContacts.length > 0 ? (
                    <ul className="space-y-2">
                      {giftingContacts.map(contact => (
                        <li key={contact.id} className="flex items-center space-x-2 text-[var(--primary-color)]">
                          <input
                            type="checkbox"
                            id={`contact-${contact.id}`}
                            checked={selectedContacts.includes(contact.id)}
                            onChange={(e) => { handleContactToggle(contact.id); playSound(clickSoundRef, 'click', soundSettings); }}
                            className="form-checkbox h-5 w-5 text-[var(--primary-color)]"
                          />
                          <label htmlFor={`contact-${contact.id}`} className="text-lg">{contact.contact_name} ({contact.contact_email})</label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[var(--primary-color)] italic text-center">No contacts available. Add one above!</p>
                  )}
                </div>
                <button
                  onClick={() => { setShowAddContactForm(true); playSound(clickSoundRef, 'click', soundSettings); }}
                  className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 self-start mb-4"
                >
                  Add New Contact
                </button>
              </>
            )}
          </>
        )}

        <div className="mt-4 p-4 border-t border-[var(--border-color)]">
          <h3 className="text-xl font-semibold text-[var(--primary-color)] mb-3">Hinting Terms & Conditions</h3>
          <div className="text-sm text-[var(--primary-color)] space-y-2 mb-4 max-h-32 overflow-y-auto custom-scrollbar">
            <p>By sending a hint, you agree to the following:</p>
            <ul className="list-disc list-inside">
              <li>Hints are sent as a suggestion and do not guarantee a gift.</li>
              <li>WyshDrop is not responsible for the fulfillment of gifts.</li>
              <li>Your contact's email will be used solely for sending this hint.</li>
              <li>Do not send excessive or spammy hints.</li>
            </ul>
          </div>
          <label className="inline-flex items-center text-[var(--primary-color)]">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => { setAgreedToTerms(e.target.checked); playSound(clickSoundRef, 'click', soundSettings); }}
              className="form-checkbox h-5 w-5 text-[var(--primary-color)]"
            />
            <span className="ml-2 text-lg">I agree to the terms and conditions.</span>
          </label>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={handleSendHint}
            disabled={!agreedToTerms || selectedContacts.length === 0}
            className={`px-6 py-3 rounded-md shadow-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 ${
              !agreedToTerms || selectedContacts.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[var(--button-bg-color)] text-white hover:bg-opacity-90'
            }`}
          >
            Send Hint
          </button>
          <button
            onClick={() => { onClose(); playSound(clickSoundRef, 'click', soundSettings); }}
            className="px-6 py-3 bg-red-500 text-white rounded-md shadow-md hover:bg-red-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Custom Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message, soundSettings, clickSoundRef }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { onClose(); playSound(clickSoundRef, 'click', soundSettings); }}>
      <div className="bg-[var(--box-bg-color)] p-6 rounded-lg shadow-lg border-2 border-[var(--border-color)] w-full max-w-sm mx-auto text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-[var(--primary-color)] mb-4">Confirm Action</h3>
        <p className="text-[var(--primary-color)] mb-6">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => { onConfirm(); onClose(); playSound(clickSoundRef, 'click', soundSettings); }}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            Confirm
          </button>
          <button
            onClick={() => { onClose(); playSound(clickSoundRef, 'click', soundSettings); }}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


// New Product Detail Page Component
const ProductDetailPage = ({ product, onProductClick, onAddProductToWishlist, onHintClick, soundSettings, bookmarkedProducts, setBookmarkedProducts, user, clickSoundRef }) => {
  // State for comments and new comment input
  const [productComments, setProductComments] = useState([]); // Initialize as empty, fetch from Supabase
  const [newCommentText, setNewCommentText] = useState('');
  const [isImageExpanded, setIsImageExpanded] = useState(false); // New state for image expansion

  // State to manage which comments are expanded
  const [expandedComments, setExpandedComments] = useState({});

  // State for delete confirmation modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState(null);

  // --- SUPABASE INTEGRATION: Fetch comments for the current product ---
  useEffect(() => {
    const fetchComments = async () => {
      if (!product || !product.id) return;

      const { data, error } = await supabase
        .from('product_comments')
        .select(`
          *,
          profiles (username) // Join to get the username from the profiles table
        `)
        .eq('product_id', product.id)
        .order('created_at', { ascending: true }); // Order by creation time

      if (error) {
        console.error('Error fetching comments:', error);
      } else {
        // Map data to include username directly
        setProductComments(data.map(comment => ({
          ...comment,
          user: comment.profiles ? comment.profiles.username : 'Anonymous' // Use username from profile, or 'Anonymous'
        })));
      }
    };

    fetchComments();
  }, [product]); // Re-fetch when product changes

  // Toggle expansion for a specific comment
  const toggleCommentExpansion = (commentId) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  if (!product) {
    return <GenericPage title="Product Not Found" content="The product you are looking for could not be found." />;
  }

  // Check if the current product is bookmarked
  const isBookmarked = bookmarkedProducts.some(item => item.id === product.id);

  // --- SUPABASE INTEGRATION: Toggle Bookmark ---
  const handleBookmarkToggle = async () => {
    playSound(clickSoundRef, 'click', soundSettings);
    if (!user.isLoggedIn || !user.id) {
      alert("Please sign in to manage your wishlist.");
      return;
    }

    try {
      if (isBookmarked) {
        // Remove from bookmarks
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);

        if (error) {
          console.error('Error removing from wishlist:', error);
          alert('Failed to remove from wishlist: ' + error.message);
        } else {
          setBookmarkedProducts(prev => prev.filter(item => item.id !== product.id));
          alert(`${product.name} removed from wishlist!`);
        }
      } else {
        // Add to bookmarks
        const { error } = await supabase
          .from('wishlists')
          .insert([
            {
              user_id: user.id,
              product_id: product.id,
              added_at: new Date().toISOString()
            }
          ]);

        if (error) {
          console.error('Error adding to wishlist:', error);
          alert('Failed to add to wishlist: ' + error.message);
        } else {
          setBookmarkedProducts(prev => [...prev, product]);
          // handleShowWishlistSuccess(product.name); // This function is not passed here, assumed to be handled by parent
          alert(`${product.name} added to wishlist!`);
        }
      }
    } catch (error) {
      console.error('Unexpected error toggling bookmark:', error);
      alert('An unexpected error occurred.');
    }
  };

  const handleGiftClick = () => {
    playSound(clickSoundRef, 'click', soundSettings);
    alert(`You've clicked to gift "${product.name}"! (This would lead to a checkout or external purchase link in a real app)`);
    // In a real application, this would redirect to a checkout page or an external retailer.
  };

  // --- SUPABASE INTEGRATION: Submit Comment ---
  const handleSubmitComment = async () => {
    playSound(clickSoundRef, 'click', soundSettings);
    if (newCommentText.trim() === '') {
      alert('Comment cannot be empty.');
      return;
    }
    if (!user.isLoggedIn || !user.id) {
      alert("Please sign in to add comments.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('product_comments')
        .insert([
          {
            product_id: product.id,
            user_id: user.id, // Use the actual user ID
            comment_text: newCommentText.trim(),
            created_at: new Date().toISOString()
          }
        ])
        .select(`
            *,
            profiles (username)
        `) // Select the inserted row with profile data
        .single();

      if (error) {
        console.error('Error submitting comment:', error);
        alert('Failed to submit comment: ' + error.message);
      } else {
        // Add the new comment to local state, including the fetched username
        setProductComments(prevComments => [...prevComments, {
            ...data,
            user: data.profiles ? data.profiles.username : 'Anonymous'
        }]);
        setNewCommentText('');
      }
    } catch (error) {
      console.error('Unexpected error submitting comment:', error);
      alert('An unexpected error occurred.');
    }
  };

  // --- SUPABASE INTEGRATION: Delete Comment ---
  const handleDeleteCommentClick = (commentId) => {
    playSound(clickSoundRef, 'click', soundSettings);
    setCommentToDeleteId(commentId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteComment = async () => {
    playSound(clickSoundRef, 'click', soundSettings);
    if (!user.id || !commentToDeleteId) {
        console.error("User or comment ID missing for deletion.");
        return;
    }

    try {
        const { error } = await supabase
            .from('product_comments')
            .delete()
            .eq('id', commentToDeleteId)
            .eq('user_id', user.id); // Ensure only the owner can delete

        if (error) {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment: ' + error.message);
        } else {
            setProductComments(prevComments => prevComments.filter(comment => comment.id !== commentToDeleteId));
            alert('Comment deleted successfully!');
        }
    } catch (error) {
        console.error('Unexpected error deleting comment:', error);
        alert('An unexpected error occurred.');
    } finally {
        setCommentToDeleteId(null);
        setShowDeleteConfirmModal(false);
    }
  };

  // Dummy recommended products for this page (will be replaced by actual data later)
  const recommendedProducts = [...Array(4)].map((_, i) => ({
    id: `rec-product-${i + 1}`,
    name: `Recommended Item ${i + 1}`,
    image_url: `https://placehold.co/240x280/A1D3B3/FFFFFF?text=Recommended+Item+${i + 1}`, // Adjusted height for more room
    price: (15 + i * 10).toFixed(2),
    description: `A great recommended item.`,
    rating: Math.floor(Math.random() * 2) + 4,
    comments: [],
    amazon_link: `https://www.amazon.com/dp/B07PFV1QCH?tag=yourtag-${i}` // Placeholder Amazon link
  }));

  return (
    <div className="flex-grow w-full py-4 pt-[130px]">
      {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
      <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] relative flex items-center justify-center">
        <img
          src={`https://placehold.co/1200x400/D3A173/FFFFFF?text=${(product.subcategory || 'Product').replace(/\s/g, '+')}+Banner`} // Use subcategory for banner
          alt={`${product.subcategory || product.name} Banner`} // Fallback to product name if subcategory is missing
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"}
        />
        {/* Removed text overlay */}
      </section>

      <div className="w-full mx-auto px-4 md:px-12 py-12 bg-[var(--box-bg-color)] rounded-lg shadow-lg border-2 border-[var(--border-color)] flex flex-col lg:flex-row items-start lg:space-x-8">
        {/* Product Image */}
        <div className="w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0">
          <div
            className={`bg-[var(--main-bg-color)] rounded-lg flex items-center justify-center text-[var(--primary-color)] text-xl transition-all duration-300 ease-in-out cursor-pointer overflow-hidden ${
              isImageExpanded ? 'fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center w-screen h-screen' : 'w-80 h-[400px]'
            }`}
            onClick={() => { setIsImageExpanded(!isImageExpanded); playSound(clickSoundRef, 'click', soundSettings); }}
          >
            <img
              src={product.image_url}
              alt={product.name}
              className={`object-contain rounded-lg ${isImageExpanded ? 'w-[90vw] h-[90vh]' : 'w-full h-full'}`} // Image fits within 90% of viewport
              onError={(e) => e.target.src = `https://placehold.co/300x450/D3A173/FFFFFF?text=${(product.name || 'Product').replace(/\s/g, '+')}+Image`}
            />
          </div>
        </div>

        {/* Product Details */}
        <div className="w-full lg:w-1/2 flex flex-col space-y-4">
          <h2 className="text-4xl font-bold text-[var(--primary-color)]">{product.name}</h2>
          <div className="flex items-center text-3xl font-semibold text-gray-700">
            <span>${product.price}</span>
            <button
              onClick={handleBookmarkToggle}
              className="ml-4 text-[var(--primary-color)] hover:text-gray-700 focus:outline-none transition-all duration-200 ease-in-out hover:scale-110 active:scale-95"
              aria-label={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
            >
              <i className={`fas fa-bookmark ${isBookmarked ? 'text-[var(--primary-color)]' : 'text-gray-400'}`}></i>
            </button>
          </div>
          <p className="text-lg text-[var(--primary-color)]">{product.description}</p>

          {/* Rating */}
          <div className="flex items-center space-x-1 text-yellow-500 text-xl">
            {[...Array(5)].map((_, i) => (
              <i key={i} className={`fas fa-star ${i < product.rating ? '' : 'text-gray-300'}`}></i>
            ))}
            <span className="text-gray-600 ml-2 text-base">({product.rating}.0 / 5 stars)</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4"> {/* Changed to grid layout */}
            <button onClick={handleGiftClick} className="px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 w-full">
              Gift
            </button>
            <button
              onClick={() => { onHintClick(product); playSound(clickSoundRef, 'click', soundSettings); }} // Call onHintClick
              className="px-6 py-3 bg-purple-500 text-white font-bold rounded-md shadow-md hover:bg-purple-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 w-full">
              <i className="fas fa-lightbulb mr-2"></i> Hint
            </button>
            <a
              href={product.amazon_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound(clickSoundRef, 'click', soundSettings)}
              className="px-6 py-3 bg-green-500 text-white font-bold rounded-md shadow-md hover:bg-green-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 text-center w-full"
            >
              Go Buy <i className="fas fa-external-link-alt ml-1"></i>
            </a>
          </div>

          {/* Comments Section */}
          <div className="mt-8">
            <h3 className="text-2xl font-bold text-[var(--primary-color)] mb-4">User Comments</h3>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md mt-4 bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              rows="3"
              placeholder="Add your comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
            ></textarea>
            <button onClick={handleSubmitComment} className="mt-2 px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
              Submit Comment
            </button>

            {/* Display existing comments */}
            <div className="mt-6 space-y-4">
              {productComments.length > 0 ? (
                productComments.map((comment) => (
                  <div key={comment.id} className="bg-[var(--main-bg-color)] p-4 rounded-md border border-[var(--border-color)]">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-semibold text-[var(--primary-color)]">{comment.user}</p>
                      {user.id === comment.user_id && ( // Only show delete if current user owns the comment
                        <button
                          onClick={() => handleDeleteCommentClick(comment.id)}
                          className="text-gray-500 hover:text-red-500 transition-colors duration-200"
                          aria-label="Delete comment"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      )}
                    </div>
                    <p className={`text-[var(--primary-color)] ${expandedComments[comment.id] ? '' : 'line-clamp-3'}`}>
                      {comment.comment_text} {/* Corrected from comment.text to comment.comment_text */}
                    </p>
                    {comment.comment_text.length > 150 && ( // Arbitrary length to show "Read More"
                      <button
                        onClick={() => toggleCommentExpansion(comment.id)}
                        className="text-sm text-[var(--primary-color)] hover:underline mt-2"
                      >
                        {expandedComments[comment.id] ? 'Read Less' : 'Read More'}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-[var(--primary-color)] italic">No comments yet. Be the first to review!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Products Section */}
      <div className="w-full mx-auto mt-8 px-4 md:px-12">
        <h3 className="text-3xl font-bold text-[var(--primary-color)] mb-6 text-center">Recommended for You</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendedProducts.map((recProduct) => (
            <div key={recProduct.id} className="bg-[var(--box-bg-color)] rounded-lg shadow-md border-2 border-[var(--border-color)] p-1 cursor-pointer transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
              onClick={() => { onProductClick(recProduct); playSound(clickSoundRef, 'click', soundSettings); }}>
              <div className="w-full h-60 bg-[var(--main-bg-color)] rounded-md flex flex-col items-center justify-center text-[var(--primary-color)] text-lg relative mb-2"> {/* New 4:5 ratio */}
                <img src={recProduct.image_url} alt={recProduct.name} className="w-full h-full object-cover rounded-md" onError={(e) => e.target.src = `https://placehold.co/240x280/A1D3B3/FFFFFF?text=${recProduct.name.replace(/\s/g, '+')}`} />
                {/* Price inside the image box */}
                <p className="absolute bottom-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded-md text-sm">${recProduct.price}</p>
              </div>
              <h4 className="text-lg font-semibold text-[var(--primary-color)] text-center mb-2">{recProduct.name}</h4>
              <button onClick={() => { onProductClick(recProduct); playSound(clickSoundRef, 'click', soundSettings); }} className="mt-auto px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 w-full">
                View Item
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={confirmDeleteComment}
        message="Are you sure you want to delete this comment?"
        soundSettings={soundSettings}
        clickSoundRef={clickSoundRef}
      />
    </div>
  );
};

// New Recommended Page Component
const RecommendedPage = ({ user, hasTakenQuiz, onQuizMeClick, onSignInClick, onProductClick, onAddProductToWishlist, soundSettings, clickSoundRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [generalRecommendedProducts, setGeneralRecommendedProducts] = useState([]);
  const [contactSpecificIdeas, setContactSpecificIdeas] = useState([]); // Stores ideas grouped by contact

  // --- SUPABASE INTEGRATION: Fetch recommended products and contact-specific ideas ---
  useEffect(() => {
    const fetchRecommendedData = async () => {
      if (!user.isLoggedIn || !user.id) {
        setGeneralRecommendedProducts([]);
        setContactSpecificIdeas([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Fetch general recommendations (if quiz taken)
      if (hasTakenQuiz) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('quiz_answers')
          .eq('id', user.id)
          .single();

        if (profileError || !profile || !profile.quiz_answers) {
          console.error('Error fetching quiz answers for general recommendations:', profileError);
        } else {
          // In a real scenario, you would use quizAnswers to filter/order products more intelligently.
          // For this demo, we'll just fetch some random products or top-rated ones.
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .limit(10) // Fetch a limited number of products
            .order('rating', { ascending: false }); // Example: order by rating

          if (error) {
            console.error('Error fetching general recommended products:', error);
          } else {
            setGeneralRecommendedProducts(data);
          }
        }
      }

      // Fetch contact-specific gift ideas
      const { data: giftIdeasData, error: giftIdeasError } = await supabase
        .from('contact_gift_ideas')
        .select(`
          *,
          gifting_contacts (contact_name)
        `)
        .eq('user_id', user.id)
        .not('contact_id', 'is', null) // Only fetch ideas associated with a contact
        .order('created_at', { ascending: false });

      if (giftIdeasError) {
        console.error('Error fetching contact-specific gift ideas:', giftIdeasError);
      } else {
        // Group ideas by contact
        const groupedIdeas = giftIdeasData.reduce((acc, idea) => {
          const contactName = idea.gifting_contacts?.contact_name || 'Unknown Contact';
          if (!acc[contactName]) {
            acc[contactName] = [];
          }
          acc[contactName].push(idea);
          return acc;
        }, {});
        setContactSpecificIdeas(groupedIdeas);
      }

      setIsLoading(false);
    };

    fetchRecommendedData();
  }, [user.isLoggedIn, hasTakenQuiz, user.id]); // Re-fetch when these dependencies change

  const handleTakeQuizPrompt = () => {
    playSound(clickSoundRef, 'click', soundSettings); // Play click sound
    // This will trigger the Quiz Modal from the App component
    onQuizMeClick();
  };

  return (
    <div className="flex-grow w-full py-4 pt-[130px]">
      {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
      <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] relative flex items-center justify-center">
        <img
          src="https://placehold.co/1200x400/D3A173/FFFFFF?text=Recommended+Banner" // Updated placeholder image
          alt="Recommended for You Banner"
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"}
        />
        {/* Removed text overlay */}
      </section>
      <div className="w-full mx-auto px-4 md:px-12">
        {!user.isLoggedIn ? (
          <div className="text-center text-xl text-[var(--primary-color)] py-12 bg-[var(--box-bg-color)] rounded-lg shadow-lg border-2 border-[var(--border-color)]">
            <p className="mb-4">Please sign in to get personalized recommendations.</p>
            <button
              onClick={() => { onSignInClick(); playSound(clickSoundRef, 'click', soundSettings); }}
              className="px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
            >
              Sign In
            </button>
          </div>
        ) : !hasTakenQuiz && Object.keys(contactSpecificIdeas).length === 0 ? (
          <div className="text-center text-xl text-[var(--primary-color)] py-12 bg-[var(--box-bg-color)] rounded-lg shadow-lg border-2 border-[var(--border-color)]">
            <p className="mb-4">Recommendations are provided through quiz answers.</p>
            <button
              onClick={handleTakeQuizPrompt}
              className="px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
            >
              Want to take your quiz now? ✨
            </button>
          </div>
        ) : isLoading ? (
          <div className="text-center text-xl text-[var(--primary-color)]">Loading recommendations...</div>
        ) : (
          <>
            {/* General Recommendations (if quiz taken) */}
            {hasTakenQuiz && generalRecommendedProducts.length > 0 && (
              <ProductSection
                title="General Recommendations"
                products={generalRecommendedProducts}
                onProductClick={onProductClick}
                onAddProductToWishlist={onAddProductToWishlist}
                soundSettings={soundSettings}
                clickSoundRef={clickSoundRef}
                showSeeMore={false}
              />
            )}

            {/* Contact-Specific Gift Ideas */}
            {Object.keys(contactSpecificIdeas).length > 0 && (
              <div className="mt-8">
                <h2 className="text-3xl font-bold text-[var(--primary-color)] mb-6 text-center">Gift Ideas for Your Contacts</h2>
                {Object.entries(contactSpecificIdeas).map(([contactName, ideas], index) => (
                  <div key={index} className="mb-12 bg-[var(--box-bg-color)] p-6 rounded-lg shadow-md border-2 border-[var(--border-color)]">
                    <h3 className="text-2xl font-semibold text-[var(--primary-color)] mb-4">For {contactName}</h3>
                    <div className="prose prose-sm max-w-none text-[var(--primary-color)]">
                      <p className="whitespace-pre-wrap">{ideas[0].generated_ideas_text}</p> {/* Displaying only the first idea's text for now */}
                    </div>
                    {/* You could optionally fetch/display products related to these ideas here */}
                    {/* For now, just showing the text generated by LLM */}
                  </div>
                ))}
              </div>
            )}

            {!hasTakenQuiz && Object.keys(contactSpecificIdeas).length === 0 && (
              <div className="text-center text-xl text-[var(--primary-color)] py-12 bg-[var(--box-bg-color)] rounded-lg shadow-lg border-2 border-[var(--border-color)]">
                <p className="mb-4">No recommendations found yet. Take the quiz or add gift ideas for your contacts to see them here!</p>
                <button
                  onClick={handleTakeQuizPrompt}
                  className="px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                >
                  Take Quiz ✨
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};


// New Cover Page Component
const CoverPage = ({ onGuestSignIn, onSignInClick, onTermsAndConditionsClick, isDarkMode, onSocialSignIn, isTransitioningOut, showApiKeyError, onCreateAccountClick, soundSettings, clickSoundRef }) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Determine background color based on dark mode
  const backgroundColor = isDarkMode ? '#000000' : '#FFDDBD'; // Black for dark, light brown for light

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center p-4 z-50 transition-all duration-1000 ease-in-out ${isTransitioningOut ? 'opacity-0 translate-y-full' : 'opacity-100 translate-y-0'}`} style={{ backgroundColor }}>
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg text-center" style={{ backgroundColor: 'var(--box-bg-color)', border: '2px solid var(--border-color)' }}>
        <img src="https://placehold.co/80x80/transparent/9A6E45?text=Logo" alt="WyshDrop Logo" className="h-20 w-20 mx-auto mb-6 object-contain" />
        <h2 className="text-4xl font-bold text-[var(--primary-color)] mb-8">Create an account</h2>

        {showApiKeyError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Supabase Error!</strong>
            <span className="block sm:inline"> Your Supabase URL or Anon Key is invalid. Please update `supabaseUrl` and `supabaseAnonKey` in `App.jsx` with your actual project details from the Supabase Dashboard.</span>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <button
            onClick={() => { onSocialSignIn('google'); playSound(clickSoundRef, 'click', soundSettings); }} // Changed to 'google' for Supabase
            className="w-full flex items-center justify-center px-6 py-3 bg-white text-gray-800 rounded-lg shadow-md hover:bg-gray-100 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            <i className="fab fa-google text-xl mr-3"></i> Sign up with Google
          </button>
          {/* Removed Apple and Microsoft Sign-up Buttons */}
        </div>

        <div className="flex items-center my-6">
          <hr className="flex-grow border-t border-gray-300" />
          <span className="px-4 text-[var(--primary-color)]">OR</span>
          <hr className="flex-grow border-t border-gray-300" />
        </div>

        <button onClick={() => { onCreateAccountClick(); playSound(clickSoundRef, 'click', soundSettings); }} className="w-full px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-lg shadow-md hover:bg-opacity-90 mb-4 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
          Create account
        </button>

        <div className="flex items-center justify-center mb-6 text-sm text-[var(--primary-color)]">
          <input
            type="checkbox"
            id="terms-checkbox"
            checked={agreedToTerms}
            onChange={(e) => { setAgreedToTerms(e.target.checked); playSound(clickSoundRef, 'click', soundSettings); }}
            className="mr-2 h-4 w-4 text-[var(--primary-color)] focus:ring-[var(--primary-color)] border-gray-300 rounded"
          />
          <label htmlFor="terms-checkbox">
            By signing up, you agree to the <a href="#" onClick={(e) => { e.preventDefault(); onTermsAndConditionsClick(); playSound(clickSoundRef, 'click', soundSettings); }} className="text-[var(--primary-color)] hover:underline">Terms of Service</a> and <a href="#" className="text-[var(--primary-color)] hover:underline">Privacy Policy</a>, including <a href="#" className="text-[var(--primary-color)] hover:underline">Cookie Use</a>.
          </label>
        </div>

        <button
          onClick={() => { onGuestSignIn(); playSound(clickSoundRef, 'click', soundSettings); }}
          disabled={!agreedToTerms}
          className={`w-full px-6 py-3 font-bold rounded-lg shadow-md transition-all duration-200 ease-in-out ${
            agreedToTerms
              ? 'bg-gray-600 text-white hover:bg-gray-700 hover:scale-105 active:scale-95'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Sign in as Guest
        </button>

        <div className="mt-8">
          <p className="text-[var(--primary-color)] mb-4">Already have an account?</p>
          <button
            onClick={() => { onSignInClick(); playSound(clickSoundRef, 'click', soundSettings); }}
            className="w-full px-6 py-3 bg-[var(--box-bg-color)] text-[var(--primary-color)] font-bold rounded-lg shadow-md border-2 border-[var(--border-color)] hover:bg-gray-100 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

// New Terms and Conditions Page Component
const TermsAndConditionsPage = ({ onBack, soundSettings, clickSoundRef }) => {
  return (
    <div className="flex-grow w-full py-4 pt-[130px]"> {/* Adjusted padding top for fixed header and nav bar */}
      {/* Changed to h-0 pb-[33.33%] for responsive aspect ratio, object-contain for image */}
      <section className="w-full h-0 pb-[33.33%] mb-8 rounded-lg shadow-lg border-2 border-[var(--border-color)] relative flex items-center justify-center">
        <img
          src="https://placehold.co/1200x400/D3A173/FFFFFF?text=Terms+Banner" // Updated placeholder image
          alt="Terms and Conditions Banner"
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          onError={(e) => e.target.src = "https://placehold.co/1200x400/D3A173/FFFFFF?text=Image+Load+Error"}
        />
        {/* Removed text overlay */}
      </section>
      <div className="w-full mx-auto px-4 md:px-12 py-12 bg-[var(--box-bg-color)] rounded-lg shadow-lg border-2 border-[var(--border-color)]"> {/* Adjusted padding */}
        <h2 className="text-3xl font-bold text-[var(--primary-color)] mb-6 text-center">WyshDrop Terms of Service</h2>
        <div className="text-[var(--primary-color)] text-lg leading-relaxed space-y-4">
          <p>Welcome to WyshDrop! These Terms of Service ("Terms") govern your use of the WyshDrop website, mobile applications, and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.</p>
          <p><strong>1. Acceptance of Terms:</strong> By creating an account, accessing, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy and Cookie Use policy. If you do not agree with any part of these Terms, you may not access or use the Service.</p>
          <p><strong>2. Changes to Terms:</strong> We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of the Service after such modifications constitutes your acceptance of the revised Terms.</p>
          <p><strong>3. User Accounts:</strong> To access certain features of the Service, you may be required to create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for any activities or actions under your account.</p>
          <p><strong>4. Use of the Service:</strong> You agree to use the Service only for lawful purposes and in accordance with these Terms. You are prohibited from using the Service for any illegal or unauthorized purpose, or to engage in any activity that is harmful, fraudulent, or violates the rights of others.</p>
          <p><strong>5. Content:</strong> You are responsible for any content you post, upload, or otherwise make available through the Service. By providing content, you grant WyshDrop a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, publish, and distribute such content in connection with the Service.</p>
          <p><strong>6. Intellectual Property:</strong> All intellectual property rights in the Service and its content (excluding user-provided content) are owned by WyshDrop or its licensors. You may not use any trademarks, logos, or other proprietary graphics without our prior written consent.</p>
          <p><strong>7. Disclaimers:</strong> The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. WyshDrop does not warrant that the Service will be uninterrupted, error-free, or secure.</p>
          <p><strong>8. Limitation of Liability:</strong> To the maximum extent permitted by applicable law, WyshDrop shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from (a) your access to or use of or inability to access or use the Service; (b) any conduct or content of any third party on the Service; or (c) unauthorized access, use, or alteration of your transmissions or content.</p>
          <p><strong>9. Governing Law:</strong> These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.</p>
          <p><strong>10. Contact Us:</strong> If you have any questions about these Terms, please contact us at info@wyshdrop.com.</p>
        </div>
        <div className="text-center mt-8">
          <button
            onClick={() => { onBack(); playSound(clickSoundRef, 'click', soundSettings); }}
            className="px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-md shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

// New Wishlist Success Popup Component
const WishlistSuccessPopup = ({ isVisible, productName, onCheckBookmarks, onClose, soundSettings, clickSoundRef }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center bg-[var(--box-bg-color)] p-4 rounded-lg shadow-lg border-2 border-[var(--border-color)] animate-fade-in-out">
      <div className="flex flex-col items-end">
        <p className="text-sm text-[var(--primary-color)] mb-1">
          Added {productName} to wishlist!
        </p>
        <button
          onClick={() => { onCheckBookmarks(); playSound(clickSoundRef, 'click', soundSettings); }}
          className="text-xs text-[var(--primary-color)] hover:underline flex items-center space-x-1"
        >
          <span>Check it out here</span>
          <i className="fas fa-arrow-right transform rotate-45 text-lg ml-1" style={{ transform: 'rotate(-45deg)' }}></i> {/* Arrow pointing towards bookmark */}
        </button>
      </div>
      <button onClick={() => { onClose(); playSound(clickSoundRef, 'click', soundSettings); }} className="ml-4 text-gray-500 hover:text-gray-700">
        <i className="fas fa-times"></i>
      </button>
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out {
          animation: fadeInOut 3s forwards;
        }
      `}</style>
    </div>
  );
};

// New Create Account Page Component
const CreateAccountPage = ({ onCreateAccount, onBackToSignIn, soundSettings, clickSoundRef }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Added password field

  const handleSubmit = async (e) => {
    e.preventDefault();
    playSound(clickSoundRef, 'click', soundSettings);
    if (!email || !firstName || !lastName || !username || !password) {
      alert('Please fill in all fields.');
      return;
    }

    // --- SUPABASE INTEGRATION: Sign Up with Email/Password ---
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            username: username,
          },
        },
      });

      if (error) {
        alert("Account creation failed: " + error.message);
        console.error("Supabase signup error:", error);
      } else if (data.user) {
        alert("Account created successfully! Please check your email to confirm your account.");
        // Supabase's onAuthStateChange listener in App.js will handle setting user state and navigation
        onCreateAccount({ email, firstName, lastName, username }); // Trigger parent to possibly update UI/state
      }
    } catch (error) {
      console.error("Unexpected error during Supabase signup:", error);
      alert("An unexpected error occurred during account creation.");
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 z-50" style={{ backgroundColor: 'var(--main-bg-color)' }}>
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg text-center" style={{ backgroundColor: 'var(--box-bg-color)', border: '2px solid var(--border-color)' }}>
        <img src="https://placehold.co/80x80/transparent/9A6E45?text=Logo" alt="WyshDrop Logo" className="h-20 w-20 mx-auto mb-6 object-contain" />
        <h2 className="text-4xl font-bold text-[var(--primary-color)] mb-8">Create Your Account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg shadow-sm border-2 border-[var(--border-color)] bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-3 rounded-lg shadow-sm border-2 border-[var(--border-color)] bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-3 rounded-lg shadow-sm border-2 border-[var(--border-color)] bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-lg shadow-sm border-2 border-[var(--border-color)] bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg shadow-sm border-2 border-[var(--border-color)] bg-[var(--main-bg-color)] text-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            Create Account
          </button>
        </form>

        <div className="mt-8">
          <p className="text-[var(--primary-color)] mb-4">Already have an account?</p>
          <button
            onClick={() => { onBackToSignIn(); playSound(clickSoundRef, 'click', soundSettings); }}
            className="w-full px-6 py-3 bg-[var(--box-bg-color)] text-[var(--primary-color)] font-bold rounded-lg shadow-md border-2 border-[var(--border-color)] hover:bg-gray-100 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

// New Splash Page Component
const SplashPage = ({ onGetStartedClick, soundSettings, clickSoundRef }) => {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-4 z-50 cursor-pointer"
      style={{ backgroundColor: 'var(--main-bg-color)' }}
      onClick={() => { onGetStartedClick(); playSound(clickSoundRef, 'click', soundSettings); }}
    >
      <div className="flex flex-col items-center justify-center flex-grow text-center">
        <h1 className="text-6xl md:text-8xl font-handwritten text-[var(--primary-color)] mb-4 animate-fade-in-up">
          WYSHDROP.
        </h1>
        <p className="text-lg md:text-xl text-[var(--primary-color)] mt-4 animate-fade-in-up delay-100">
          Work in progress but feel free to click anywhere to get started.
        </p>
      </div>

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 mb-8 z-10">
        <a
          href="mailto:lydiaandcrim@gmail.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { e.stopPropagation(); playSound(clickSoundRef, 'click', soundSettings); }} // Stop propagation to prevent page transition
          className="px-6 py-3 bg-[var(--button-bg-color)] text-white font-bold rounded-full shadow-lg hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 flex items-center justify-center"
        >
          <i className="fas fa-envelope mr-2"></i> Gmail
        </a>
        <a
          href="https://www.instagram.com/lydiaandcrim?igsh=MThiZDk0Y3F6anlzNg=="
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { e.stopPropagation(); playSound(clickSoundRef, 'click', soundSettings); }} // Stop propagation
          className="px-6 py-3 bg-pink-500 text-white font-bold rounded-full shadow-lg hover:bg-pink-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 flex items-center justify-center"
        >
          <i className="fab fa-instagram mr-2"></i> Instagram
        </a>
        <a
          href="https://www.youtube.com/@LydiaAndCrim"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => { e.stopPropagation(); playSound(clickSoundRef, 'click', soundSettings); }} // Stop propagation
          className="px-6 py-3 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 flex items-center justify-center"
        >
          <i className="fab fa-youtube mr-2"></i> YouTube
        </a>
      </div>

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out {
          animation: fadeInOut 3s forwards;
        }

        @keyframes fadeInFromBottom {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInFromBottom 1s ease-out forwards;
        }
        .animate-fade-in-up.delay-100 {
          animation-delay: 0.1s;
        }
      `}</style>
    </div>
  );
};

// Main App component
const App = () => {
  console.log("App component is rendering."); // Added for debugging
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Initialize currentPage from localStorage or default to 'splash'
  const [currentPage, setCurrentPage] = useState(localStorage.getItem('lastPage') || 'splash');
  const [currentCategory, setCurrentCategory] = useState('');
  const [currentSubcategory, setCurrentSubcategory] = useState('');
  const [user, setUser] = useState({ isLoggedIn: false, username: 'Guest', email: '', id: null, profile_image_url: null });
  const [hasTakenQuiz, setHasTakenQuiz] = useState(false);
  const [bookmarkedProducts, setBookmarkedProducts] = useState([]);
  const [isGeneralFeedbackModalOpen, setIsGeneralFeedbackModalOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCoverPageTransitioningOut, setIsCoverPageTransitioningOut] = useState(false);
  const [showApiKeyError, setShowApiKeyError] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showQuizPromptModal, setShowQuizPromptModal] = useState(false);
  const [showWishlistSuccessPopup, setShowWishlistSuccessPopup] = useState(false);
  const [wishlistPopupProductName, setWishlistPopupProductName] = useState('');
  const [showHintModal, setShowHintModal] = useState(false);
  const [giftingContacts, setGiftingContacts] = useState([]);

  const clickSoundRef = useRef(null);
  const scrollSoundRef = useRef(null);
  const pageTransitionSoundRef = useRef(null);

  // Initialize sound settings from localStorage or default
  const [soundSettings, setSoundSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('soundSettings');
      return savedSettings ? JSON.parse(savedSettings) : {
        isAllSoundEnabled: true,
        isClickSoundEnabled: true,
        isScrollSoundEnabled: false,
        isPageTransitionSoundEnabled: false,
      };
    } catch (error) {
      console.error("Error parsing sound settings from localStorage:", error);
      return { // Default fallback
        isAllSoundEnabled: true,
        isClickSoundEnabled: true,
        isScrollSoundEnabled: false,
        isPageTransitionSoundEnabled: false,
      };
    }
  });
  useEffect(() => {
    // Declare authListener here so it's accessible in the cleanup function.
    // It will hold the subscription object from Supabase.
    let authListener = null;

    // --- STEP 1: Set up the *ongoing* authentication state change listener immediately ---
    // This ensures authListener gets its value right when the effect runs,
    // regardless of whether getSession() has completed or not.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event, "Session:", session);
        if (session) {
          const userEmail = session.user.email;
          const userName = session.user.user_metadata?.username || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
          const userId = session.user.id;

          // Try to fetch existing profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profileError && profileError.code === 'PGRST116') { // No rows found (profile doesn't exist)
            console.log("Profile not found, creating new profile...");
            // Create new profile
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: userId,
                  username: userName,
                  first_name: session.user.user_metadata?.first_name || null,
                  last_name: session.user.user_metadata?.last_name || null,
                  email: userEmail,
                  profile_image_url: session.user.user_metadata?.avatar_url || null,
                  has_taken_quiz: false,
                  quiz_answers: {},
                  sound_settings: { // Default sound settings for new user
                    isAllSoundEnabled: true,
                    isClickSoundEnabled: true,
                    isScrollSoundEnabled: false,
                    isPageTransitionSoundEnabled: false,
                  },
                  is_dark_mode: false, // Default dark mode for new user
                }
              ])
              .select()
              .single();

            if (insertError) {
              console.error('Error creating profile:', insertError);
            } else {
              console.log("New profile created:", newProfile);
              setUser({
                isLoggedIn: true,
                username: newProfile.username,
                email: newProfile.email,
                id: newProfile.id,
                profile_image_url: newProfile.profile_image_url
              });
              setHasTakenQuiz(newProfile.has_taken_quiz);
              await fetchUserSpecificData(newProfile.id); // Fetch other user-specific data
              setCurrentPage('home');
            }
          } else if (profileError) {
            console.error('Error fetching profile:', profileError);
          } else if (profile) {
            // Profile exists, set user state
            setUser({
              isLoggedIn: true,
              username: profile.username,
              email: profile.email,
              id: profile.id,
              profile_image_url: profile.profile_image_url
            });
            setHasTakenQuiz(profile.has_taken_quiz);
            await fetchUserSpecificData(profile.id); // Fetch other user-specific data
            setCurrentPage('home');
          }
        } else {
          // No session or signed out
          setUser({ isLoggedIn: false, username: 'Guest', email: '', id: null, profile_image_url: null });
          setHasTakenQuiz(false);
          setBookmarkedProducts([]);
          setGiftingContacts([]);
          setCurrentPage('splash'); // Redirect to splash if no session
        }
        setIsCoverPageTransitioningOut(false); // Reset transition state after auth check
      }
    );
    authListener = listener; // Assign the listener to the outer variable immediately

    // --- STEP 2: Perform an *initial* session check on mount ---
    // This is in case onAuthStateChange doesn't fire immediately on page load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const userEmail = session.user.email;
        const userName = session.user.user_metadata?.username || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
        const userId = session.user.id;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
            console.log("Initial session check: Profile not found, will be created on next auth event.");
            // Don't create here, let onAuthStateChange handle it after signup/login
        } else if (profile) {
            setUser({
                isLoggedIn: true,
                username: profile.username,
                email: profile.email,
                id: profile.id,
                profile_image_url: profile.profile_image_url
            });
            setHasTakenQuiz(profile.has_taken_quiz);
            await fetchUserSpecificData(profile.id);
            setCurrentPage('home');
        }
      } else {
        setUser({ isLoggedIn: false, username: 'Guest', email: '', id: null, profile_image_url: null });
        setCurrentPage('splash');
      }
      setIsCoverPageTransitioningOut(false);
    }).catch(error => {
      console.error("Error getting initial Supabase session:", error.message);
      setUser({ isLoggedIn: false, username: 'Guest', email: '', id: null, profile_image_url: null });
      setCurrentPage('splash');
      setShowApiKeyError(true);
      setIsCoverPageTransitioningOut(false);
    });

    // --- STEP 3: Cleanup function ---
    // This will run when the component unmounts.
    return () => {
      // Only try to unsubscribe if authListener was successfully assigned a value
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  // Initialize dark mode from localStorage or default
  // Removed duplicate isDarkMode state declaration to fix redeclaration error

  // Effect to load Tone.js and initialize players
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js";
    script.async = true;
    script.onload = () => {
      console.log("Tone.js loaded successfully via CDN.");
      if (window.Tone) { // Check if Tone is available on window
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // IMPORTANT: YOU MUST REPLACE THESE EMPTY STRINGS WITH DIRECT, RAW LINKS TO YOUR OWN HOSTED SOUND FILES.
        // Generic placeholder URLs (like soundhelix.com) often do not work due to CORS policies or direct linking restrictions.
        // You need to host your MP3/WAV files yourself (e.e.g., on Firebase Storage, AWS S3, or another CDN)
        // and provide the direct, publicly accessible URLs here.
        //
        // For GitHub, ensure you are using the "Raw" link (e.g., raw.githubusercontent.com/your-username/your-repo/main/sounds/click.mp3)
        // NOT the regular github.com link.
        //
        // Example: "https://raw.githubusercontent.com/your-username/your-repo/main/sounds/click.mp3"
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        clickSoundRef.current = new window.Tone.Player({
          url: "YOUR_RAW_GITHUB_URL_FOR_CLICK_SOUND.mp3", // <--- REPLACE THIS WITH YOUR ACTUAL RAW GITHUB URL for click sound
          onload: () => console.log("Click sound loaded"),
          onerror: (e) => console.error("Error loading click sound:", e)
        }).toDestination();

        // Scroll and page transition sounds are disabled by default, but still need players initialized
        scrollSoundRef.current = new window.Tone.Player({
          url: "YOUR_RAW_GITHUB_URL_FOR_SCROLL_SOUND.mp3", // <--- REPLACE THIS WITH YOUR ACTUAL RAW GITHUB URL for scroll sound
          onload: () => console.log("Scroll sound loaded"),
          onerror: (e) => console.error("Error loading scroll sound:", e)
        }).toDestination();

        pageTransitionSoundRef.current = new window.Tone.Player({
          url: "YOUR_RAW_GITHUB_URL_FOR_PAGE_TRANSITION_SOUND.mp3", // <--- REPLACE THIS WITH YOUR ACTUAL RAW GITHUB URL for page transition sound
          onload: () => console.log("Page transition sound loaded"),
          onerror: (e) => console.error("Error loading page transition sound:", e)
        }).toDestination();
      }
    };
    
    script.onerror = (e) => console.error("Error loading Tone.js via CDN:", e);
    document.body.appendChild(script);

    return () => {
      // Cleanup Tone.js players and script on unmount
      if (clickSoundRef.current) clickSoundRef.current.dispose();
      if (scrollSoundRef.current) scrollSoundRef.current.dispose();
      if (pageTransitionSoundRef.current) pageTransitionSoundRef.current.dispose();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []); // Empty dependency array means it runs once on mount


  // Color scheme states - these will hold the *currently active* colors
  const [currentMainBgColor, setCurrentMainBgColor] = useState("#FFDDBD");
  const [currentPrimaryColor, setCurrentPrimaryColor] = useState("#9A6E45");
  const [currentBorderColor, setCurrentBorderColor] = useState("#D3A173");
  const [currentBoxBgColor, setCurrentBoxBgColor] = useState("#FFFFFF");
  const [currentButtonBgColor, setCurrentButtonBgColor] = useState("#9A6E45");
  const [currentFooterBgColor, setCurrentFooterBgColor] = useState("#9A6E45");

  const [isDarkMode, setIsDarkMode] = useState(false);
  // Function to apply a selected color palette
  const applyPalette = useCallback((palette) => {
    const mode = isDarkMode ? 'dark' : 'light';
    const colors = palette[mode];

    document.documentElement.style.setProperty('--main-bg-color', colors.mainBg);
    document.documentElement.style.setProperty('--primary-color', colors.primary);
    document.documentElement.style.setProperty('--border-color', colors.border);
    document.documentElement.style.setProperty('--box-bg-color', colors.boxBg);
    document.documentElement.style.setProperty('--button-bg-color', colors.buttonBg);
    document.documentElement.style.setProperty('--footer-bg-color', colors.footerBg);

    // Update the current color states in App component
    setCurrentMainBgColor(colors.mainBg);
    setCurrentPrimaryColor(colors.primary);
    setCurrentBorderColor(colors.border);
    setCurrentBoxBgColor(colors.boxBg);
    setCurrentButtonBgColor(colors.buttonBg);
    setCurrentFooterBgColor(colors.footerBg);
  }, [isDarkMode]); // Recreate if dark mode changes

  // Effect to apply initial palette based on dark mode and saved preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('isDarkMode');
    const initialDarkMode = savedDarkMode ? JSON.parse(savedDarkMode) : false;
    setIsDarkMode(initialDarkMode); // Set initial dark mode state

    // Find the default palette or the one that matches current colors
    const currentPaletteData = colorPalettes.find(p =>
      (p.light.mainBg === currentMainBgColor && !initialDarkMode) || (p.dark.mainBg === currentMainBgColor && initialDarkMode)
    ) || colorPalettes[0]; // Fallback to first palette if no match

    applyPalette(currentPaletteData); // Apply the initial palette
  }, [applyPalette]); // Dependency on applyPalette to ensure it's stable

  // Define color palettes with both light and dark modes
  const colorPalettes = [
    {
      name: "Default",
      light: { mainBg: "#FFDDBD", primary: "#9A6E45", border: "#D3A173", boxBg: "#FFFFFF", buttonBg: "#9A6E45", footerBg: "#9A6E45" },
      dark: { mainBg: "#000000", primary: "#FFFFFF", border: "#5A5BA6", boxBg: "#343570", buttonBg: "#333333", footerBg: "#000000" } // Changed buttonBg to #333333
    },
    {
      name: "Ocean Blue", // Desaturated pastel
      light: { mainBg: "#E0F2F7", primary: "#2C5282", border: "#A7D9EB", boxBg: "#FFFFFF", buttonBg: "#4299E1", footerBg: "#2C5282" },
      dark: { mainBg: "#2C6B9E", primary: "#FFFFFF", border: "#000000", boxBg: "#07083C", buttonBg: "#333333", footerBg: "000000" } // Changed buttonBg to #333333
    },
    {
      name: "Forest Green", // Desaturated forest green
      light: { mainBg: "#EAF4E4", primary: "#4F7942", border: "#C8DCCB", boxBg: "#FFFFFF", buttonBg: "#6B8E23", footerBg: "#4F7942" },
      dark: { mainBg: "#43631B", primary: "#FFFFFF", border: "#000000", boxBg: "#063A0D", buttonBg: "#333333", footerBg: "#000000" } // Changed buttonBg to #333333
    },
    {
      name: "Lavender", // Light lavender
      light: { mainBg: "#F8F0FF", primary: "#7753A5", border: "#E1CCF7", boxBg: "#FFFFFF", buttonBg: "#A58EDF", footerBg: "#9370DB" },
      dark: { mainBg: "#3C1C55", primary: "#FFFFFF", border: "#000000", boxBg: "#1D063A", buttonBg: "#333333", footerBg: "#000000" } // Changed buttonBg to #333333
    },
  ];

  const toggleDarkMode = async () => { // Made async to await Supabase update
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      const currentPaletteData = colorPalettes.find(p =>
        (p.light.mainBg === currentMainBgColor && !prevMode) || (p.dark.mainBg === currentMainBgColor && prevMode)
      ) || colorPalettes[0];

      const selectedColors = newMode ? currentPaletteData.dark : currentPaletteData.light;
      setCurrentMainBgColor(selectedColors.mainBg);
      setCurrentPrimaryColor(selectedColors.primary);
      setCurrentBorderColor(selectedColors.border);
      setCurrentBoxBgColor(selectedColors.boxBg);
      setCurrentButtonBgColor(selectedColors.buttonBg);
      setCurrentFooterBgColor(selectedColors.footerBg);

      // Save to localStorage
      localStorage.setItem('isDarkMode', JSON.stringify(newMode));

      // Save to Supabase profile if logged in
      if (user.isLoggedIn && user.id) {
        supabase.from('profiles')
          .update({ is_dark_mode: newMode, updated_at: new Date().toISOString() })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error('Error updating dark mode in profile:', error);
            else console.log('Dark mode preference saved to profile.');
          });
      }
      return newMode;
    });
  };

  // Modify setSoundSettings to save to Supabase and localStorage
  const updateSoundSettings = async (newSettings) => { // Renamed for clarity
    setSoundSettings(newSettings);
    // Save to localStorage
    localStorage.setItem('soundSettings', JSON.stringify(newSettings));

    // Save to Supabase profile if logged in
    if (user.isLoggedIn && user.id) {
      const { error } = await supabase.from('profiles')
        .update({ sound_settings: newSettings, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) console.error('Error updating sound settings in profile:', error);
      else console.log('Sound settings saved to profile.');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const categories = [
    "Trending", "Books", "Accessories", "DIY/Art", "Tech",
    "Cups / Drinks", "Stationary", "Music", "Figurines / Plushies",
    "Gift Cards", "Blooms", "Recommended", "Quiz Me", "Donate" // Added Recommended
  ];

  // Handlers for navigation
  const handleSearchClick = () => setCurrentPage('search');
  const handleBookmarkClick = () => setCurrentPage('bookmarks');
  const handleSettingsClick = () => setCurrentPage('settings');
  const handleProfileClick = () => setCurrentPage('profile');
  const handleBack = () => {
    // Simple back logic: if on product detail, go to home (or previous category/search if implemented)
    if (currentPage === 'product-detail') {
      setCurrentPage('home'); // For simplicity, always go back to home for now
      setSelectedProduct(null);
    } else if (['subcategory', 'recommended'].includes(currentPage) || categories.includes(currentPage)) {
      setCurrentPage('home');
    } else if (currentPage === 'terms-conditions') {
      setCurrentPage('cover'); // Go back to cover page from T&C
    } else if (currentPage === 'create-account') { // Back from create account page
      setCurrentPage('cover');
    }
    else {
      setCurrentPage('home');
    }
  };

  const handleCategoryClick = (event, category) => {
    if (event) event.preventDefault(); // Prevent default link behavior if event is provided
    if (category === "Quiz Me") {
      setShowQuizModal(true); // Open quiz modal directly
    } else if (category === "Donate") {
      handleDonateClick(); // Trigger donate action
    } else if (category === "Recommended") {
      handleRecommendedClick();
    }
    else {
      setCurrentPage(category);
      setCurrentCategory(category);
    }
  };

  const handleSubcategoryClick = (subcategory) => {
    setCurrentPage('subcategory');
    setCurrentSubcategory(subcategory);
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setCurrentPage('product-detail');
  };

  const handleWyshDropClick = () => {
    setCurrentPage('home');
  };

  const handleSidebarNavigation = (pageName) => {
    setCurrentPage(pageName);
    setIsSidebarOpen(false); // Close sidebar after navigation
  };

  const handleDonateClick = () => {
    console.log("Donate button clicked!");
    // Implement donation logic (e.g., redirect to a donation page or show a modal)
    setIsSidebarOpen(false); // Close sidebar
    alert("Thank you for your interest in donating! Donation features are coming soon."); // Simple alert for now
  };

  const handleGeneralFeedbackSubmit = (feedback) => {
    console.log("General feedback submitted:", feedback);
    // Implement feedback submission logic
  };

  // Function to show wishlist success popup
  const handleShowWishlistSuccess = (productName) => {
    setWishlistPopupProductName(productName);
    setShowWishlistSuccessPopup(true);
    setTimeout(() => {
      setShowWishlistSuccessPopup(false);
      setWishlistPopupProductName('');
    }, 3000); // Disappear after 3 seconds
  };

  // --- SUPABASE INTEGRATION: Add Product to Wishlist ---
  const handleAddProductToWishlist = async (product) => {
    if (!user.isLoggedIn || !user.id) {
      alert("Please sign in to add items to your wishlist.");
      return;
    }

    // Check if product already exists in local state (for immediate UI update)
    const isAlreadyBookmarked = bookmarkedProducts.some(item => item.id === product.id);
    if (isAlreadyBookmarked) {
      alert(`${product.name} is already in your wishlist!`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wishlists')
        .insert([
          {
            user_id: user.id,
            product_id: product.id,
            added_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Error adding to wishlist:', error);
        alert('Failed to add to wishlist: ' + error.message);
      } else {
        console.log('Added to wishlist:', data);
        // Update local state to reflect the change
        setBookmarkedProducts(prev => [...prev, product]);
        handleShowWishlistSuccess(product.name);
      }
    } catch (error) {
      console.error('Unexpected error adding to wishlist:', error);
      alert('An unexpected error occurred.');
    }
  };

  // Handler for opening the Hint modal
  const handleHintClick = (product) => {
    setSelectedProduct(product); // Ensure the product is set for the modal
    setShowHintModal(true);
  };


  // Header visibility logic
  const toggleHeaderVisibility = useCallback(() => {
    setIsHeaderVisible(prev => !prev);
  }, []);

  useEffect(() => {
    const handleScroll = debounce(() => { // Debounce the scroll handler
      const currentScrollY = window.scrollY;

      // Only play scroll sound if there's actual scrolling and sound is enabled
      // The scroll sound is now disabled by default, so this will not play unless enabled in settings.
      if (Math.abs(currentScrollY - lastScrollY) > 20) { // Threshold to prevent sound on minor movements
        playSound(scrollSoundRef, 'scroll', soundSettings);
      }

      // If at the very top, always show header
      if (currentScrollY === 0) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsHeaderVisible(false);
      } else {
        // Scrolling up
        setIsHeaderVisible(true);
      }
      setLastScrollY(currentScrollY);
    }, 100); // Debounce for 100ms

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, soundSettings, scrollSoundRef]); // Add soundSettings and scrollSoundRef to dependency array

  // --- SUPABASE INTEGRATION: Helper function to fetch user-specific data ---
  const fetchUserSpecificData = async (userId) => {
      if (!userId) return;

      // Fetch Profile (for quiz status, settings, etc.)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile data:', profileError);
      } else if (profile) {
        setUser(prev => ({
          ...prev,
          username: profile.username,
          email: profile.email,
          profile_image_url: profile.profile_image_url,
          id: profile.id, // Ensure ID is set
          isLoggedIn: true, // Confirm logged in
        }));
        setHasTakenQuiz(profile.has_taken_quiz);
        // Apply fetched sound settings, with a fallback
        setSoundSettings(profile.sound_settings || {
          isAllSoundEnabled: true,
          isClickSoundEnabled: true,
          isScrollSoundEnabled: false,
          isPageTransitionSoundEnabled: false,
        });
        // Apply fetched dark mode
        setIsDarkMode(profile.is_dark_mode || false);
        // Apply palette based on fetched dark mode
        const currentPaletteData = colorPalettes.find(p =>
          (p.light.mainBg === currentMainBgColor && !profile.is_dark_mode) || (p.dark.mainBg === currentMainBgColor && profile.is_dark_mode)
        ) || colorPalettes[0];
        applyPalette(currentPaletteData);
      }

      // Fetch Wishlist
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlists')
        .select('product_id, products(*)')
        .eq('user_id', userId);

      if (wishlistError) {
        console.error('Error fetching wishlist:', wishlistError);
      } else {
        setBookmarkedProducts(wishlistData.map(item => item.products));
      }

      // Fetch Gifting Contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('gifting_contacts')
        .select('*')
        .eq('user_id', userId);

      if (contactsError) {
        console.error('Error fetching gifting contacts:', contactsError);
      } else {
        setGiftingContacts(contactsData);
      }
  };

   useEffect(() => {
  // Initial check for session when the app loads
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session) {
      const userEmail = session.user.email;
      const userName = session.user.user_metadata?.username || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
      const userId = session.user.id;

      // Fetch profile on initial session check
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile on initial session:', profileError);
        // If profile doesn't exist on initial load, it will be created on next auth change
      }

      setUser({
        isLoggedIn: true,
        username: profile?.username || userName,
        email: profile?.email || userEmail,
        id: userId,
        profile_image_url: profile?.profile_image_url || session.user.user_metadata?.avatar_url || null
      });
      setHasTakenQuiz(profile?.has_taken_quiz || false);

      await fetchUserSpecificData(userId); // Fetch user-specific data
      setCurrentPage('home');
    } else {
      setUser({ isLoggedIn: false, username: 'Guest', email: '', id: null, profile_image_url: null });
      setCurrentPage('splash'); // Keep on splash if no session
    }
    setIsCoverPageTransitioningOut(false); // Reset transition state after initial session check
  }).catch(error => {
    console.error("Error getting initial Supabase session:", error.message);
    // If there's an error getting session, assume not logged in and show cover page
    setUser({ isLoggedIn: false, username: 'Guest', email: '', id: null, profile_image_url: null });
    setCurrentPage('splash'); // Keep on splash if API key error
    setShowApiKeyError(true); // Indicate a potential Supabase config issue
    setIsCoverPageTransitioningOut(false);
  });
}, []); // Empty dependency array to run once on mount

  // Handle guest sign-in (no change needed for Supabase as it's not a direct auth method)
  const handleGuestSignIn = () => {
    setIsCoverPageTransitioningOut(true); // Trigger transition out
    setTimeout(() => {
      setUser({ isLoggedIn: true, username: 'Guest', email: 'guest@wyshdrop.com', id: 'guest-user-id', profile_image_url: null }); // Assign a dummy ID for guest
      setCurrentPage('home'); // Navigate to home page after guest sign-in
      setIsCoverPageTransitioningOut(false); // Reset transition state
    }, 1000); // Match CSS transition duration
  };

  // Handle sign-in button click on cover page (for future authentication flow)
  // This will now lead to email/password or social sign-in via Supabase
  const handleCoverSignInClick = () => {
    // For a real app, this would show an email/password login form or redirect to a dedicated login page.
    // For now, we'll just simulate a successful login for demo purposes.
    // In a real app, you'd likely navigate to a dedicated login form or trigger a modal.
    alert("This would lead to an email/password login form or social login options.");
    // For now, we'll just let the user try social sign-in or create account.
  };

  // --- SUPABASE INTEGRATION: Handle social sign-in (Google) using Supabase ---
  const handleSocialSignIn = async (providerName) => {
    setIsCoverPageTransitioningOut(true); // Start transition out before redirect
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerName, // 'google'
        options: {
          redirectTo: window.location.origin, // Redirect back to the current origin
        },
      });

      if (error) {
        console.error(`Error during ${providerName} Sign-In:`, error.message);
        alert(`${providerName} Sign-In failed: ` + error.message);
        setShowApiKeyError(true); // Indicate a potential Supabase config issue
        setIsCoverPageTransitioningOut(false); // Reset transition state if an error occurs
      }
      // Supabase handles the redirect automatically, so no need for further logic here.
      // The onAuthStateChange listener will pick up the session after redirect.
    } catch (error) {
      console.error(`Unexpected error during ${providerName} Sign-In:`, error);
      alert(`An unexpected error occurred during ${providerName} Sign-In.`);
      setIsCoverPageTransitioningOut(false); // Reset transition state
    }
  };

  // --- SUPABASE INTEGRATION: Function to sign out using Supabase ---
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
        alert("Failed to sign out. Please try again.");
      } else {
        console.log("User signed out.");
        setUser({ isLoggedIn: false, username: 'Guest', email: '', id: null, profile_image_url: null });
        setHasTakenQuiz(false);
        setBookmarkedProducts([]);
        setGiftingContacts([]);
        setIsCoverPageTransitioningOut(true); // Trigger transition out for a moment before going back to cover
        setTimeout(() => {
          setCurrentPage('cover');
          setIsCoverPageTransitioningOut(false); // Reset transition state
        }, 1000); // Match CSS transition duration
      }
    } catch (error) {
      console.error("Error during Supabase signOut:", error);
      alert("An unexpected error occurred during sign out.");
    }
  };

  // Handle Terms and Conditions navigation from CoverPage
  const handleTermsAndConditionsClick = () => {
    setCurrentPage('terms-conditions');
  };

  // Handle "Recommended" navigation
  const handleRecommendedClick = () => {
    if (!user.isLoggedIn) {
      setCurrentPage('cover'); // Redirect to cover page if not logged in
    } else if (!hasTakenQuiz && giftingContacts.length === 0) { // Only show prompt if no quiz taken AND no contacts with ideas
      setShowQuizPromptModal(true); // Show quiz prompt if logged in but no quiz taken
    } else {
      setCurrentPage('recommended'); // Go to recommended page
    }
  };

  const handleQuizComplete = (answers) => {
    setHasTakenQuiz(true); // This will be updated by the profile fetch if logged in
    setShowQuizModal(false); // Close the quiz modal
    console.log("Quiz completed with answers:", answers);
    // The quiz answers are saved to Supabase profile directly in QuizModal
  };

  // Handle account creation from CreateAccountPage (email/password signup)
  // The actual supabase.auth.signUp call is now in CreateAccountPage component
  const handleCreateAccount = (accountDetails) => {
    // This function is now primarily for updating App.js state or triggering navigation
    // after the signup in CreateAccountPage is initiated.
    console.log("Create account initiated from CreateAccountPage:", accountDetails);
    // The onAuthStateChange listener will handle the actual user state update and navigation to 'home'
  };

  // New handler for splash page to cover page transition
  const handleGetStartedClick = () => {
    setCurrentPage('cover');
  };


  return (
    <div className={`min-h-screen font-inter flex flex-col items-center transition-colors duration-300`}
         style={{ backgroundColor: `var(--main-bg-color)`, color: `var(--text-color)` }}>
      {/* Font Awesome for icons */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />

      {/* Conditional rendering of SplashPage, CoverPage or Main App content */}
      {currentPage === 'splash' ? (
        <SplashPage
          onGetStartedClick={handleGetStartedClick}
          soundSettings={soundSettings}
          clickSoundRef={clickSoundRef}
        />
      ) : currentPage === 'cover' ? (
        <CoverPage
          onGuestSignIn={handleGuestSignIn}
          onSignInClick={handleCoverSignInClick}
          onTermsAndConditionsClick={handleTermsAndConditionsClick}
          isDarkMode={isDarkMode}
          onSocialSignIn={handleSocialSignIn} // Pass the new handler
          isTransitioningOut={isCoverPageTransitioningOut} // Pass transition state
          showApiKeyError={showApiKeyError} // Pass API key error state
          onCreateAccountClick={() => setCurrentPage('create-account')} // New handler for create account
          soundSettings={soundSettings} // Pass sound settings
          clickSoundRef={clickSoundRef}
        />
      ) : currentPage === 'create-account' ? (
        <CreateAccountPage
          onCreateAccount={handleCreateAccount}
          onBackToSignIn={() => setCurrentPage('cover')}
          soundSettings={soundSettings} // Pass sound settings
          clickSoundRef={clickSoundRef}
        />
      ) : (
        <>
          {/* Header (now reusable and passed props) */}
          <Header
            toggleSidebar={toggleSidebar}
            onSearchClick={handleSearchClick}
            onBookmarkClick={handleBookmarkClick}
            onSettingsClick={handleSettingsClick}
            onProfileClick={handleProfileClick}
            onBack={handleBack}
            currentPage={currentPage}
            onWyshDropClick={handleWyshDropClick}
            isHeaderVisible={isHeaderVisible}
            toggleHeaderVisibility={toggleHeaderVisibility}
            user={user} // Pass user object
            onQuizMeClick={() => setShowQuizModal(true)} // Direct quiz modal open 
            onDonateClick={handleDonateClick}
            onFeedbackClick={() => setIsGeneralFeedbackModalOpen(true)}
            onSignInClick={handleCoverSignInClick} // For profile dropdown sign-in
            onSignUpClick={handleCoverSignInClick} // For profile dropdown sign-up (same as sign-in for demo)
            soundSettings={soundSettings} // Pass sound settings
            clickSoundRef={clickSoundRef}
          />

          {/* Category Navigation Bar (now always rendered) */}
          {/* Positioned relative to header's height (approx 64px based on p-4) */}
          <nav className={`w-full bg-[var(--border-color)] py-2 px-2 sm:px-4 md:px-12 overflow-x-auto whitespace-nowrap shadow-md custom-scrollbar-horizontal transition-transform duration-300 ${isHeaderVisible ? 'top-16' : '-translate-y-full'} fixed left-0 z-20`}>
            <div className="flex space-x-6 justify-start pt-2 pb-1"> {/* Increased top padding for spacing */}
              {categories.map((category) => (
                <a
                  key={category}
                  href="#"
                  onClick={(e) => { handleCategoryClick(e, category); playSound(clickSoundRef, 'click', soundSettings); }} // Pass event and category
                  className="text-white text-sm font-semibold hover:text-[var(--primary-color)] hover:bg-white px-3 py-1 rounded-md transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 flex-shrink-0" // Added flex-shrink-0
                >
                  {category}
                </a>
              ))}
            </div>
          </nav>

          {/* Sidebar Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => { toggleSidebar(); playSound(clickSoundRef, 'click', soundSettings); }}
              aria-hidden="true"
            ></div>
          )}

          {/* Sidebar Menu */}
          <div
            className={`fixed top-0 left-0 h-full w-64 bg-[var(--box-bg-color)] shadow-xl z-50 transform transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="p-4 flex justify-between items-center border-b border-[var(--border-color)]">
              <h2 className="text-2xl font-handwritten text-[var(--primary-color)]">Menu</h2>
              <button
                onClick={() => { toggleSidebar(); playSound(clickSoundRef, 'click', soundSettings); }}
                aria-label="Close menu"
                className="text-[var(--primary-color)] hover:text-gray-700 focus:outline-none transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <nav className="p-4 flex flex-col space-y-4 flex-grow"> {/* flex-grow to push donate/feedback to bottom */}
              <a href="#" onClick={() => { handleSidebarNavigation('home'); playSound(clickSoundRef, 'click', soundSettings); }} className="text-lg text-[var(--primary-color)] hover:text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">Home</a>
              <a href="#" onClick={() => { setShowQuizModal(true); playSound(clickSoundRef, 'click', soundSettings); }} className="text-lg text-[var(--primary-color)] hover:text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">Quiz Me</a> {/* Added to sidebar */}
              {/* Removed "Gift Ideas" */}
              <a href="#" onClick={() => { handleSidebarNavigation('how-it-works'); playSound(clickSoundRef, 'click', soundSettings); }} className="text-lg text-[var(--primary-color)] hover:text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">How it Works</a>
              <a href="#" onClick={() => { handleSidebarNavigation('my-hints'); playSound(clickSoundRef, 'click', soundSettings); }} className="text-lg text-[var(--primary-color)] hover:text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">My Hints</a>
              <a href="#" onClick={() => { handleSidebarNavigation('about-us'); playSound(clickSoundRef, 'click', soundSettings); }} className="text-lg text-[var(--primary-color)] hover:text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">About us</a> {/* New About us link */}
              <a href="#" onClick={() => { handleSidebarNavigation('contact-us'); playSound(clickSoundRef, 'click', soundSettings); }} className="text-lg text-[var(--primary-color)] hover:text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">Contact Us</a>
              <a href="#" onClick={() => { handleSidebarNavigation('faqs'); playSound(clickSoundRef, 'click', soundSettings); }} className="text-lg text-[var(--primary-color)] hover:text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">FAQs</a> {/* New FAQ link */}
              <a href="#" onClick={() => { handleSidebarNavigation('careers'); playSound(clickSoundRef, 'click', soundSettings); }} className="text-lg text-[var(--primary-color)] hover:text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">Careers</a> {/* New Careers link */}
            </nav>
            {/* Donate and Feedback buttons at the bottom of the sidebar */}
            <div className="p-4 border-t border-[var(--border-color)] flex flex-col space-y-2">
              <button
                onClick={() => { handleDonateClick(); playSound(clickSoundRef, 'click', soundSettings); }}
                className="w-full px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
              >
                Donate
              </button>
              <button
                onClick={() => { setIsGeneralFeedbackModalOpen(true); setIsSidebarOpen(false); playSound(clickSoundRef, 'click', soundSettings); }}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
              >
                Feedback
              </button>
            </div>
          </div>

          {/* Conditional Page Rendering */}
          {currentPage === 'home' && (
            <HomeContent
              onSeeMoreClick={handleSubcategoryClick}
              onDiscoverClick={handleSearchClick}
              isLoggedIn={user.isLoggedIn}
              onAboutUsClick={() => handleSidebarNavigation('about-us')}
              onProductClick={handleProductClick}
              onAddProductToWishlist={handleAddProductToWishlist}
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
              handleCategoryClick={handleCategoryClick} // <--- ADD THIS LINE
            />
          )}
          {currentPage === 'search' && (
            <SearchPage
              handleCategoryClick={handleCategoryClick}
              onSeeMoreClick={handleSubcategoryClick}
              onProductClick={handleProductClick}
              onAddProductToWishlist={handleAddProductToWishlist}
              onQuizMeClick={() => setShowQuizModal(true)} // Pass quiz me handler
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'bookmarks' && (
            <BookmarksPage bookmarkedProducts={bookmarkedProducts} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
          )}
          {currentPage === 'settings' && (
            <SettingsPage
              applyPalette={applyPalette} // Pass applyPalette function
              colorPalettes={colorPalettes} // Pass all color palettes
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
              soundSettings={soundSettings} // Pass sound settings
              updateSoundSettings={updateSoundSettings} // <--- CHANGE THIS LINE
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'profile' && (
            <ProfilePage
              user={user}
              onSignOut={handleSignOut}
              onAboutUsClick={() => handleSidebarNavigation('about-us')}
              giftingContacts={giftingContacts} // Pass gifting contacts
              setGiftingContacts={setGiftingContacts} // Pass setter for contacts
              onProductClick={handleProductClick} // Pass product click handler
              onAddProductToWishlist={handleAddProductToWishlist} // Pass add to wishlist handler
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'how-it-works' && (
            <GenericPage
              title="How WyshDrop Works"
              content={`
                <h3 class="text-3xl font-bold text-[var(--primary-color)] mb-4 text-center">Your Ultimate Gifting Companion</h3>
                <p class="mb-6 text-center">WyshDrop is designed to make gifting effortless, thoughtful, and fun. Whether you're searching for the perfect present, dropping a hint for yourself, or organizing your gift ideas, we've got you covered.</p>

                <h4 class="text-2xl font-semibold text-[var(--primary-color)] mb-3">1. Discover & Explore</h4>
                <p class="mb-4">Browse through a vast collection of products across various categories like Books, Tech, Accessories, and more. Our intuitive search and filtering options help you narrow down your choices quickly. Explore trending items, popular searches, or dive deep into specific subcategories.</p>

                <h4 class="text-2xl font-semibold text-[var(--primary-color)] mb-3">2. Create & Manage Wishlists</h4>
                <p class="mb-4">Found something you love? Easily add it to your personal wishlist. Keep track of all the items you desire, organize them, and revisit them anytime. Your wishlist can be a private space for your aspirations or a guide for your loved ones.</p>

                <h4 class="text-2xl font-semibold text-[var(--primary-color)] mb-3">3. Get Personalized Recommendations</h4>
                <p class="mb-4">Take our fun "Quiz Me" quiz to receive highly personalized gift ideas tailored to your preferences or the recipient's. The more information you provide, the better our recommendations become! You can even associate these ideas with specific gifting contacts.</p>

                <h4 class="text-2xl font-semibold text-[var(--primary-color)] mb-3">4. Send Subtle Hints</h4>
                <p class="mb-4">Want to receive a specific gift without explicitly asking? Our "Hint" feature allows you to subtly suggest items from your wishlist to your gifting contacts. It's the perfect way to ensure you get what you truly want, making gifting a win-win for everyone.</p>

                <h4 class="text-2xl font-semibold text-[var(--primary-color)] mb-3">5. Connect with Gifting Contacts</h4>
                <p class="mb-4">Add your friends, family, and colleagues as gifting contacts. This helps you keep track of their preferences, quiz results, and even their wishlists (if they choose to share them), making thoughtful gifting easier than ever.</p>

                <h4 class="text-2xl font-semibold text-[var(--primary-color)] mb-3">6. Customize Your Experience</h4>
                <p class="mb-4">Personalize WyshDrop to your liking with various settings, including dark mode, sound effects, and custom color schemes. Make the app truly yours!</p>

                <p class="mt-8 text-center text-xl font-semibold">WyshDrop: Making every gift a perfect match!</p>
              `}
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'my-hints' && (
            <GenericPage
              title="My Hints"
              content="This is where you can manage all the hints you've sent or received. Keep track of your gifting journey!"
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'contact-us' && (
            <GenericPage
              title="Contact Us"
              content={`
                <h3 class="text-3xl font-bold text-[var(--primary-color)] mb-4 text-center">Get in Touch!</h3>
                <p class="mb-4 text-center">We'd love to hear from you. Whether you have questions, feedback, or just want to say hello, feel to reach out!</p>

                <div class="flex flex-col items-center space-y-4 mb-8">
                  <div class="flex items-center space-x-2 text-lg">
                    <i class="fas fa-envelope text-[var(--primary-color)]"></i>
                    <a href="mailto:lydiaandcrim@gmail.com" class="text-[var(--primary-color)] hover:underline">info@wyshdrop.com</a>
                  </div>
                  <div class="flex items-center space-x-2 text-lg text-[var(--primary-color)]">
                    <i class="fas fa-phone text-[var(--primary-color)]"></i>
                    <span>Phone number coming soon!</span>
                  </div>
                </div>

                <h3 class="text-3xl font-bold text-[var(--primary-color)] mb-4 text-center">Find Us on Social Media!</h3>
                <div class="flex justify-center space-x-6 text-4xl mb-8">
                  <a href="https://www.youtube.com/channel/Lydia&Crim" target="_blank" rel="noopener noreferrer" aria-label="YouTube" class="text-red-600 hover:text-red-700 transition-all duration-200 ease-in-out hover:scale-110">
                    <i class="fab fa-youtube"></i>
                  </a>
                  <a href="#" aria-label="Instagram" class="text-pink-500 hover:text-pink-600 transition-all duration-200 ease-in-out hover:scale-110">
                    <i class="fab fa-instagram"></i>
                  </a>
                  <a href="#" aria-label="TikTok" class="text-black hover:text-gray-800 transition-all duration-200 ease-in-out hover:scale-110">
                    <i class="fab fa-tiktok"></i>
                  </a>
                </div>
              `}
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'about-us' && (
            <GenericPage
              title="About Us"
              content={`
                <h3 class="text-3xl font-bold text-[var(--primary-color)] mb-4 text-center">Our Goal</h3>
                <p class="mb-8 text-center">At WyshDrop, our goal is simple: to transform the art of gifting into an effortless and joyful experience for everyone. We believe that giving and receiving gifts should be a source of happiness, free from stress and uncertainty. Our platform is designed to help you find the perfect gift every time, fostering stronger connections and creating memorable moments.</p>

                <h3 class="text-3xl font-bold text-[var(--primary-color)] mb-4 text-center">The Three Scenarios We Hope to Uncover</h3>
                <p class="mb-6 text-center">WyshDrop is built to cater to diverse gifting needs and challenges:</p>
                <ol class="list-decimal list-inside space-y-4 mb-12 px-4 md:px-8">
                  <li><strong>The Thoughtful Giver:</strong> For those who genuinely want to give a meaningful and desired gift but struggle with ideas or knowing what someone truly wants. WyshDrop provides personalized recommendations and easy access to wishlists, ensuring your thoughtful gesture hits the mark.</li>
                  <li><strong>The Hint-Dropper:</strong> For individuals who wish to receive gifts they truly desire without having to explicitly ask or risk getting something they don't need. Our platform allows users to create and manage wishlists, subtly share them, and ensure their loved ones have a clear idea of their preferences.</li>
                  <li><strong>The Last-Minute Shopper:</strong> We understand that life gets busy! For those who need a quick, yet thoughtful gift solution, WyshDrop offers efficient search, curated categories, and personalized suggestions to help you find the ideal present even when time is short.</li>
                </ol>

                <h3 class="text-3xl font-bold text-[var(--primary-color)] mb-6 text-center">The Creators</h3>
                <div class="flex flex-col md:flex-row justify-center items-stretch gap-8 mb-12">
                  <div class="flex-1 flex flex-col items-center text-center bg-[var(--main-bg-color)] p-6 rounded-lg shadow-md border-2 border-[var(--border-color)]">
                    <img src="https://placehold.co/150x150/A1D3B3/FFFFFF?text=Crim" alt="Crim's Profile" class="w-32 h-32 rounded-full object-cover mb-4 border-4 border-[var(--primary-color)]"/>
                    <h4 class="text-2xl font-bold text-[var(--primary-color)] mb-2">Crim</h4>
                    <p>Crim is the visionary behind WyshDrop's user experience and design. With a keen eye for aesthetics and a deep understanding of user psychology, Crim ensures that every interaction on the platform is intuitive, delightful, and visually appealing. Their passion for seamless digital experiences is at the heart of WyshDrop's inviting interface.</p>
                  </div>
                  <div class="flex-1 flex flex-col items-center text-center bg-[var(--main-bg-color)] p-6 rounded-lg shadow-md border-2 border-[var(--border-color)]">
                    <img src="https://placehold.co/150x150/D3A173/FFFFFF?text=Lydia" alt="Lydia's Profile" class="w-32 h-32 rounded-full object-cover mb-4 border-4 border-[var(--primary-color)]"/>
                    <h4 class="text-2xl font-bold text-[var(--primary-color)] mb-2">Lydia</h4>
                    <p>Lydia is the technical architect and driving force behind WyshDrop's robust functionality. With expertise in backend systems and data management, Lydia ensures the platform is secure, scalable, and performs flawlessly. Their dedication to innovative technology makes WyshDrop a reliable and powerful tool for all your gifting needs.</p>
                  </div>
                </div>
              `}
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'faqs' && (
            <GenericPage
              title="Frequently Asked Questions"
              content="Find answers to common questions about WyshDrop, our features, and how to get the most out of your gifting experience."
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'careers' && (
            <GenericPage
              title="Careers"
              content="Join the WyshDrop team! We're looking for passionate individuals to help us revolutionize the world of gifting. Check out our open positions."
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'terms-conditions' && (
            <TermsAndConditionsPage onBack={handleBack} soundSettings={soundSettings} clickSoundRef={clickSoundRef} />
          )}
          {currentPage === 'privacy-consent' && (
            <GenericPage
              title="Privacy & Consent"
              content="Your privacy is paramount to us. This page details how WyshDrop collects, uses, and protects your personal information, and your rights regarding your data."
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {categories.includes(currentPage) && currentPage !== 'Recommended' && currentPage !== 'Quiz Me' && currentPage !== 'Donate' && (
            <CategoryPage
              categoryName={currentCategory}
              onSeeMoreClick={handleSubcategoryClick}
              onProductClick={handleProductClick}
              onAddProductToWishlist={handleAddProductToWishlist}
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'subcategory' && (
            <SubcategoryPage
              subcategoryName={currentSubcategory}
              onProductClick={handleProductClick}
              onAddProductToWishlist={handleAddProductToWishlist}
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}
          {currentPage === 'product-detail' && selectedProduct && (
            <ProductDetailPage
              product={selectedProduct}
              onProductClick={handleProductClick}
              onAddProductToWishlist={handleAddProductToWishlist}
              onHintClick={handleHintClick} // Pass the hint click handler
              soundSettings={soundSettings}
              bookmarkedProducts={bookmarkedProducts} // Pass bookmark state
              setBookmarkedProducts={setBookmarkedProducts} // Pass bookmark setter
              user={user} // Pass user object for comments
              clickSoundRef={clickSoundRef} // Pass clickSoundRef
            />
          )}
          {currentPage === 'recommended' && (
            <RecommendedPage
              user={user}
              hasTakenQuiz={hasTakenQuiz}
              onQuizMeClick={() => setShowQuizModal(true)}
              onSignInClick={handleCoverSignInClick}
              onProductClick={handleProductClick}
              onAddProductToWishlist={handleAddProductToWishlist}
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
            />
          )}

          {/* Feedback Rectangle (always visible) */}
          <div className="fixed bottom-4 right-4 bg-[var(--box-bg-color)] p-3 rounded-md shadow-lg border border-[var(--border-color)] text-sm text-[var(--primary-color)] z-50 cursor-pointer transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
            <a onClick={() => { setIsGeneralFeedbackModalOpen(true); playSound(clickSoundRef, 'click', soundSettings); }} className="hover:underline">Feedback?</a>
          </div>

          {/* General Feedback Modal (opened from sidebar) */}
          <FeedbackModal
            isOpen={isGeneralFeedbackModalOpen}
            onClose={() => setIsGeneralFeedbackModalOpen(false)}
            onSubmit={handleGeneralFeedbackSubmit}
            purpose="general-feedback"
            soundSettings={soundSettings}
            clickSoundRef={clickSoundRef}
          />

          {/* Quiz Modal (globally accessible) */}
          <QuizModal
            isOpen={showQuizModal}
            onClose={() => setShowQuizModal(false)}
            onQuizComplete={handleQuizComplete}
            soundSettings={soundSettings}
            clickSoundRef={clickSoundRef}
            user={user} // Pass user to QuizModal
            giftingContacts={giftingContacts} // Pass gifting contacts to QuizModal
          />

          {/* Quiz Prompt Modal (for Recommended page) */}
          {showQuizPromptModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setShowQuizPromptModal(false); playSound(clickSoundRef, 'click', soundSettings); }}>
              <div className="bg-[var(--box-bg-color)] p-6 rounded-lg shadow-lg border-2 border-[var(--border-color)] w-full max-w-sm mx-auto text-center" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-[var(--primary-color)] mb-4">Get Personalized Recommendations!</h3>
                <p className="text-[var(--primary-color)] mb-6">Recommendations are provided through quiz answers. Want to take your quiz now?</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => { setShowQuizModal(true); setShowQuizPromptModal(false); playSound(clickSoundRef, 'click', soundSettings); }}
                    className="px-4 py-2 bg-[var(--button-bg-color)] text-white rounded-md hover:bg-opacity-90 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                  >
                    Take Quiz ✨
                  </button>
                  <button
                    onClick={() => { setShowQuizPromptModal(false); playSound(clickSoundRef, 'click', soundSettings); }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                  >
                    No, Thanks
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wishlist Success Popup */}
          <WishlistSuccessPopup
            isVisible={showWishlistSuccessPopup}
            productName={wishlistPopupProductName}
            onCheckBookmarks={() => { setCurrentPage('bookmarks'); setShowWishlistSuccessPopup(false); playSound(clickSoundRef, 'click', soundSettings); }}
            onClose={() => { setShowWishlistSuccessPopup(false); playSound(clickSoundRef, 'click', soundSettings); }}
            soundSettings={soundSettings}
            clickSoundRef={clickSoundRef}
          />

          {/* Hint Modal */}
          {selectedProduct && ( // Only render if a product is selected for hinting
            <HintModal
              isOpen={showHintModal}
              onClose={() => setShowHintModal(false)}
              product={selectedProduct}
              giftingContacts={giftingContacts}
              setGiftingContacts={setGiftingContacts}
              soundSettings={soundSettings}
              clickSoundRef={clickSoundRef}
              user={user} // Pass user to HintModal
            />
          )}

          {/* Footer Section (now always rendered) */}
          <footer className="w-full bg-[var(--footer-bg-color)] text-white p-8 mt-8 rounded-t-xl shadow-inner">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start space-y-4 md:space-y-0">
              <nav className="flex flex-col space-y-2 text-center md:text-left">
                <a href="#" onClick={() => { handleSidebarNavigation('about-us'); playSound(clickSoundRef, 'click', soundSettings); }} className="hover:underline text-lg transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">About us</a>
                {/* Contact us with dropdown */}
                <div
                  className="relative"
                  // Removed onMouseEnter/onMouseLeave to simplify, as showContactDropdown is not defined
                >
                  <a href="#" onClick={() => { handleSidebarNavigation('contact-us'); playSound(clickSoundRef, 'click', soundSettings); }} className="hover:underline text-lg transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">Contact us</a>
                </div>
                <a href="#" onClick={() => { handleSidebarNavigation('privacy-consent'); playSound(clickSoundRef, 'click', soundSettings); }} className="hover:underline text-lg transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">Privacy / consent</a>
                <a href="#" onClick={() => { handleSidebarNavigation('terms-conditions'); playSound(clickSoundRef, 'click', soundSettings); }} className="hover:underline text-lg transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">Terms & Conditions</a>
                <a href="#" onClick={() => { handleSidebarNavigation('faqs'); playSound(clickSoundRef, 'click', soundSettings); }} className="hover:underline text-lg transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">FAQs</a> {/* Added to footer */}
                <a href="#" onClick={() => { handleSidebarNavigation('careers'); playSound(clickSoundRef, 'click', soundSettings); }} className="hover:underline text-lg transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">Careers</a> {/* Added to footer */}
              </nav>
              <div className="flex space-x-6 text-2xl">
                {/* Social Media Icons */}
                <a href="https://www.youtube.com/channel/Lydia&Crim" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-gray-200 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
                  <i className="fab fa-youtube"></i>
                </a>
                <a href="#" aria-label="Instagram" className="hover:text-gray-200 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
                  <i className="fab fa-instagram"></i>
                </a>
                <a href="#" aria-label="TikTok" className="hover:text-gray-200 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
                  <i className="fab fa-tiktok"></i>
                </a>
              </div>
            </div>
            <div className="text-center text-sm mt-6 text-gray-200 flex items-center justify-center space-x-2">
              <span>&copy; {new Date().getFullYear()} WyshDrop. All rights reserved.</span>
            </div>
          </footer>
        </>
      )}

      {/* Custom Styles for Handwritten Font and Scrollbar */}
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
        .font-handwritten {
          font-family: 'Permanent Marker', cursive;
        }
        .font-inter {
          font-family: 'Inter', sans-serif;
        }
        /* Custom scrollbar for product sections */
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: transparent; /* Made transparent by default */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--border-color); /* Show on hover */
        }
        /* Custom scrollbar for horizontal category bar */
        .custom-scrollbar-horizontal::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar-thumb {
          background: var(--primary-color); /* Made transparent by default */
          border-radius: 3px;
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar-thumb:hover {
          background: var(--primary-color); /* Show on hover */
        }
        /* Line clamp for comments */
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        `}
      </style>
    </div>
  );
};

export default App;