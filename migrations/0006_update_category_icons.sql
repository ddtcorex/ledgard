-- Update category icons from Lucide names to Material Symbol names
-- Demo/default categories
UPDATE categories SET icon = 'account_balance_wallet' WHERE id = 'cat-income' AND icon = 'briefcase';
UPDATE categories SET icon = 'payments' WHERE id = 'cat-salary' AND icon = 'wallet';
UPDATE categories SET icon = 'redeem' WHERE id = 'cat-bonus' AND icon = 'badge-dollar-sign';
UPDATE categories SET icon = 'apartment' WHERE id = 'cat-rent' AND icon = 'building-2';
UPDATE categories SET icon = 'bolt' WHERE id = 'cat-electricity' AND icon = 'zap';
UPDATE categories SET icon = 'wifi' WHERE id = 'cat-internet' AND icon = 'wifi';
UPDATE categories SET icon = 'shopping_cart' WHERE id = 'cat-expense-food' AND icon = 'shopping-cart';
UPDATE categories SET icon = 'grocery' WHERE id = 'cat-groceries' AND icon = 'shopping-cart';
UPDATE categories SET icon = 'restaurant' WHERE id = 'cat-dining' AND icon = 'utensils';
UPDATE categories SET icon = 'directions_car' WHERE id = 'cat-expense-transport' AND icon = 'car';
UPDATE categories SET icon = 'local_gas_station' WHERE id = 'cat-fuel' AND icon = 'fuel';
UPDATE categories SET icon = 'hail' WHERE id = 'cat-rideshare' AND icon = 'car-front';
UPDATE categories SET icon = 'auto_awesome' WHERE id = 'cat-expense-life' AND icon = 'sparkles';
UPDATE categories SET icon = 'movie' WHERE id = 'cat-entertainment' AND icon = 'film';
UPDATE categories SET icon = 'medical_services' WHERE id = 'cat-health' AND icon = 'heart-pulse';

-- Production Vietnamese categories
UPDATE categories SET icon = 'account_balance_wallet' WHERE id = 'cat-prod-income' AND icon = 'briefcase';
UPDATE categories SET icon = 'shopping_cart' WHERE id = 'cat-prod-necessities' AND icon = 'shopping-cart';
UPDATE categories SET icon = 'checkroom' WHERE id = 'cat-prod-shopping' AND icon = 'shirt';
UPDATE categories SET icon = 'school' WHERE id = 'cat-prod-education' AND icon = 'graduation-cap';
UPDATE categories SET icon = 'auto_awesome' WHERE id = 'cat-prod-play' AND icon = 'sparkles';
UPDATE categories SET icon = 'volunteer_activism' WHERE id = 'cat-prod-give' AND icon = 'heart-handshake';
UPDATE categories SET icon = 'account_balance' WHERE id = 'cat-prod-finance' AND icon = 'landmark';
UPDATE categories SET icon = 'more_horiz' WHERE id = 'cat-prod-other-expense' AND icon = 'circle-ellipsis';

UPDATE categories SET icon = 'payments' WHERE id = 'cat-prod-income-salary' AND icon = 'wallet';
UPDATE categories SET icon = 'redeem' WHERE id = 'cat-prod-income-bonus' AND icon = 'badge-dollar-sign';
UPDATE categories SET icon = 'business_center' WHERE id = 'cat-prod-income-business' AND icon = 'briefcase-business';
UPDATE categories SET icon = 'savings' WHERE id = 'cat-prod-income-interest' AND icon = 'piggy-bank';
UPDATE categories SET icon = 'redeem' WHERE id = 'cat-prod-income-gift' AND icon = 'gift';
UPDATE categories SET icon = 'more_horiz' WHERE id = 'cat-prod-income-other' AND icon = 'circle-ellipsis';

UPDATE categories SET icon = 'restaurant' WHERE id = 'cat-prod-food' AND icon = 'utensils';
UPDATE categories SET icon = 'grocery' WHERE id = 'cat-prod-market' AND icon = 'shopping-basket';
UPDATE categories SET icon = 'bolt' WHERE id = 'cat-prod-utilities' AND icon = 'zap';
UPDATE categories SET icon = 'directions_bus' WHERE id = 'cat-prod-transport' AND icon = 'bus';
UPDATE categories SET icon = 'home' WHERE id = 'cat-prod-housing' AND icon = 'home';
UPDATE categories SET icon = 'child_care' WHERE id = 'cat-prod-children' AND icon = 'baby';
UPDATE categories SET icon = 'medical_services' WHERE id = 'cat-prod-healthcare' AND icon = 'heart-pulse';

UPDATE categories SET icon = 'checkroom' WHERE id = 'cat-prod-clothing' AND icon = 'shirt';
UPDATE categories SET icon = 'chair' WHERE id = 'cat-prod-household-items' AND icon = 'armchair';
UPDATE categories SET icon = 'devices' WHERE id = 'cat-prod-electronics' AND icon = 'laptop';
UPDATE categories SET icon = 'spa' WHERE id = 'cat-prod-personal-care' AND icon = 'sparkles';

UPDATE categories SET icon = 'menu_book' WHERE id = 'cat-prod-learning' AND icon = 'graduation-cap';
UPDATE categories SET icon = 'auto_stories' WHERE id = 'cat-prod-books' AND icon = 'book-open';
UPDATE categories SET icon = 'cast_for_education' WHERE id = 'cat-prod-courses' AND icon = 'presentation';

UPDATE categories SET icon = 'movie' WHERE id = 'cat-prod-entertainment' AND icon = 'film';
UPDATE categories SET icon = 'flight' WHERE id = 'cat-prod-travel' AND icon = 'plane';
UPDATE categories SET icon = 'celebration' WHERE id = 'cat-prod-hobby' AND icon = 'party-popper';
UPDATE categories SET icon = 'local_cafe' WHERE id = 'cat-prod-cafe-restaurant' AND icon = 'coffee';

UPDATE categories SET icon = 'volunteer_activism' WHERE id = 'cat-prod-charity' AND icon = 'heart-handshake';
UPDATE categories SET icon = 'card_giftcard' WHERE id = 'cat-prod-wedding-gift' AND icon = 'gift';
UPDATE categories SET icon = 'waving_hand' WHERE id = 'cat-prod-visiting' AND icon = 'hand-heart';
UPDATE categories SET icon = 'redeem' WHERE id = 'cat-prod-family-gift' AND icon = 'package-heart';

UPDATE categories SET icon = 'security' WHERE id = 'cat-prod-insurance' AND icon = 'shield-check';
UPDATE categories SET icon = 'receipt_long' WHERE id = 'cat-prod-bank-fee' AND icon = 'receipt';
UPDATE categories SET icon = 'description' WHERE id = 'cat-prod-tax-fee' AND icon = 'file-text';
UPDATE categories SET icon = 'trending_up' WHERE id = 'cat-prod-investment' AND icon = 'trending-up';

UPDATE categories SET icon = 'more_horiz' WHERE id = 'cat-prod-other' AND icon = 'circle-ellipsis';
