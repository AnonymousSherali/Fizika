"""
O'zbekiston tumanlari va viloyatga bo'ysunuvchi shaharlari (FT-2.1) — ro'yxatdan o'tishda tanlash uchun.
Maktab modelidagi `district` maydoni erkin matn bo'lib qoladi: ro'yxatda yo'q nom (yangi tuman) ham kiritilishi mumkin.
"""

DISTRICTS = {
    "toshkent_sh": [
        "Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek", "Olmazor", "Sergeli", "Shayxontohur", "Uchtepa",
        "Yakkasaroy", "Yangihayot", "Yashnobod", "Yunusobod",
    ],
    "toshkent": [
        "Bekobod tumani", "Bo'ka", "Bo'stonliq", "Chinoz", "Ohangaron tumani", "Oqqo'rg'on", "O'rtachirchiq",
        "Parkent", "Piskent", "Qibray", "Quyichirchiq", "Toshkent tumani", "Yangiyo'l tumani", "Yuqorichirchiq",
        "Zangiota", "Angren sh.", "Bekobod sh.", "Chirchiq sh.", "Nurafshon sh.", "Ohangaron sh.", "Olmaliq sh.",
        "Yangiyo'l sh.",
    ],
    "andijon": [
        "Andijon tumani", "Asaka", "Baliqchi", "Bo'ston", "Buloqboshi", "Izboskan", "Jalaquduq", "Marhamat",
        "Oltinko'l", "Paxtaobod", "Qo'rg'ontepa", "Shahrixon", "Ulug'nor", "Xo'jaobod", "Andijon sh.", "Xonobod sh.",
    ],
    "buxoro": [
        "Buxoro tumani", "G'ijduvon", "Jondor", "Kogon tumani", "Olot", "Peshku", "Qorako'l", "Qorovulbozor",
        "Romitan", "Shofirkon", "Vobkent", "Buxoro sh.", "Kogon sh.",
    ],
    "fargona": [
        "Bag'dod", "Beshariq", "Buvayda", "Dang'ara", "Farg'ona tumani", "Furqat", "Oltiariq", "O'zbekiston",
        "Qo'shtepa", "Quva", "Rishton", "So'x", "Toshloq", "Uchko'prik", "Yozyovon", "Farg'ona sh.", "Marg'ilon sh.",
        "Qo'qon sh.", "Quvasoy sh.",
    ],
    "jizzax": [
        "Arnasoy", "Baxmal", "Do'stlik", "Forish", "G'allaorol", "Mirzacho'l", "Paxtakor", "Sharof Rashidov",
        "Yangiobod", "Zafarobod", "Zarbdor", "Zomin", "Jizzax sh.",
    ],
    "xorazm": [
        "Bog'ot", "Gurlan", "Hazorasp", "Qo'shko'pir", "Shovot", "Tuproqqal'a", "Urganch tumani", "Xiva tumani",
        "Xonqa", "Yangiariq", "Yangibozor", "Urganch sh.", "Xiva sh.",
    ],
    "namangan": [
        "Chortoq", "Chust", "Davlatobod", "Kosonsoy", "Mingbuloq", "Namangan tumani", "Norin", "Pop",
        "To'raqo'rg'on", "Uchqo'rg'on", "Uychi", "Yangiqo'rg'on", "Namangan sh.",
    ],
    "navoiy": [
        "Karmana", "Konimex", "Navbahor", "Nurota", "Qiziltepa", "Tomdi", "Uchquduq", "Xatirchi", "Navoiy sh.",
        "G'ozg'on sh.", "Zarafshon sh.",
    ],
    "qashqadaryo": [
        "Chiroqchi", "Dehqonobod", "G'uzor", "Kasbi", "Kitob", "Ko'kdala", "Koson", "Mirishkor", "Muborak", "Nishon",
        "Qamashi", "Qarshi tumani", "Shahrisabz tumani", "Yakkabog'", "Qarshi sh.", "Shahrisabz sh.",
    ],
    "samarqand": [
        "Bulung'ur", "Ishtixon", "Jomboy", "Kattaqo'rg'on tumani", "Narpay", "Nurobod", "Oqdaryo", "Pastdarg'om",
        "Paxtachi", "Payariq", "Qo'shrabot", "Samarqand tumani", "Toyloq", "Urgut", "Samarqand sh.",
        "Kattaqo'rg'on sh.",
    ],
    "sirdaryo": [
        "Boyovut", "Guliston tumani", "Mirzaobod", "Oqoltin", "Sardoba", "Sayxunobod", "Sirdaryo tumani", "Xovos",
        "Guliston sh.", "Shirin sh.", "Yangiyer sh.",
    ],
    "surxondaryo": [
        "Angor", "Bandixon", "Boysun", "Denov", "Jarqo'rg'on", "Muzrabot", "Oltinsoy", "Qiziriq", "Qumqo'rg'on",
        "Sariosiyo", "Sherobod", "Sho'rchi", "Termiz tumani", "Uzun", "Termiz sh.",
    ],
    "qoraqalpogiston": [
        "Amudaryo", "Beruniy", "Bo'zatov", "Chimboy", "Ellikqal'a", "Kegeyli", "Mo'ynoq", "Nukus tumani",
        "Qanliko'l", "Qo'ng'irot", "Qorao'zak", "Shumanay", "Taxiatosh", "Taxtako'pir", "To'rtko'l", "Xo'jayli",
        "Nukus sh.",
    ],
}
