/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;

    const discountCoefficient = 1 - discount / 100;

    return sale_price * quantity * discountCoefficient;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    let percent = 0;

    if (index === 0) {
        percent = 15;
    } else if (index === 1 || index === 2) {
        percent = 10;
    } else if (index < total - 1) {
        percent = 5;
    }

    return (profit * percent) / 100;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {

    // Проверка входных данных
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records) ||
        data.sellers.length === 0 ||
        data.products.length === 0 ||
        data.purchase_records.length === 0
    ) {
        throw new Error("Некорректные входные данные");
    }

    // Проверка наличия опций
    if (
        !options ||
        typeof options !== "object" ||
        Array.isArray(options)
    ) {
        throw new Error("Некорректные опции");
    }

    const { calculateRevenue, calculateBonus } = options;

    if (
        typeof calculateRevenue !== "function" ||
        typeof calculateBonus !== "function"
    ) {
        throw new Error("Отсутствуют функции расчета");
    }

    // Подготовка промежуточных данных
    const sellerStats = data.sellers.map((seller) => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексация продавцов
    const sellerIndex = Object.fromEntries(
        sellerStats.map((seller) => [seller.id, seller])
    );

    // Индексация товаров
    const productIndex = Object.fromEntries(
        data.products.map((product) => [product.sku, product])
    );

    // Расчет выручки и прибыли
    data.purchase_records.forEach((record) => {
        const seller = sellerIndex[record.seller_id];

        if (!seller) {
            return;
        }

        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach((item) => {
            const product = productIndex[item.sku];

            if (!product) {
                return;
            }

            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);

            seller.profit += revenue - cost;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }

            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((sellerA, sellerB) => sellerB.profit - sellerA.profit);

    // Назначение бонусов и формирование топ-10 товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(
            index,
            sellerStats.length,
            seller
        );

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku,
                quantity
            }))
            .sort((productA, productB) => productB.quantity - productA.quantity)
            .slice(0, 10);
    });

    // Итоговый результат
    return sellerStats.map((seller) => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}