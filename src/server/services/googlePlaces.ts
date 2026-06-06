export interface PlaceLead {
  name: string;
  location: string;
  website?: string;
  phone?: string;
  address?: string;
  placeId?: string;
  rating?: number;
  userRatingsTotal?: number;
  category: string;
}

export async function searchGooglePlaces(query: string, apiKey?: string, limit = 10): Promise<PlaceLead[]> {
  const key = apiKey || process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    const q = query.toLowerCase();
    const mockLeads: PlaceLead[] = [];
    
    if (q.includes("skin") || q.includes("beauty") || q.includes("kosmetik") || q.includes("cantik")) {
      mockLeads.push(
        {
          name: "Elora Beauty Care",
          location: "Bandung",
          address: "Jl. Diponegoro No.15, Citarum, Kec. Bandung Wetan, Kota Bandung, Jawa Barat 40115",
          category: "beauty salon",
          rating: 4.8,
          userRatingsTotal: 342,
          website: "https://elorabeautycare.co.id",
          phone: "6281234567801",
          placeId: "chIJe-beauty-elora"
        },
        {
          name: "Nirmala Halal Skincare",
          location: "Jakarta Selatan",
          address: "Jl. Kemang Raya No.88, Bangka, Mampang Prataan, Kota Jakarta Selatan, DKI Jakarta 12730",
          category: "cosmetics store",
          rating: 4.6,
          userRatingsTotal: 128,
          website: "https://nirmalahalal.com",
          phone: "6285711223344",
          placeId: "chIJe-skin-nirmala"
        },
        {
          name: "Klinik Estetika Muslimah",
          location: "Surabaya",
          address: "Jl. Manyar Kertoarjo No.45, Mojo, Kec. Gubeng, Kota Surabaya, Jawa Timur 60115",
          category: "skin care clinic",
          rating: 4.7,
          userRatingsTotal: 89,
          website: "https://estetikamuslimah.id",
          phone: "628113456789",
          placeId: "chIJe-clinic-estetika"
        }
      );
    } else if (q.includes("umroh") || q.includes("haji") || q.includes("travel")) {
      mockLeads.push(
        {
          name: "Barakah Umroh & Haji Service",
          location: "Bandung",
          address: "Jl. Buah Batu No.120, Cijagra, Kec. Lengkong, Kota Bandung, Jawa Barat 40265",
          category: "travel agency",
          rating: 4.9,
          userRatingsTotal: 512,
          website: "https://barakahumroh.co.id",
          phone: "6281299887766",
          placeId: "chIJe-travel-barakah"
        },
        {
          name: "Safir Tour & Travel Amanah",
          location: "Jakarta Timur",
          address: "Jl. Raden Inten II No.62, Duren Sawit, Kota Jakarta Timur, DKI Jakarta 13440",
          category: "travel agency",
          rating: 4.7,
          userRatingsTotal: 195,
          website: "https://safiramanah.com",
          phone: "6282133445566",
          placeId: "chIJe-travel-safir"
        },
        {
          name: "Al-Haramain Wisata Religi",
          location: "Solo",
          address: "Jl. Slamet Riyadi No.250, Timuran, Kec. Banjarsari, Kota Surakarta, Jawa Tengah 57141",
          category: "travel agency",
          rating: 4.5,
          userRatingsTotal: 64,
          phone: "6281355667788",
          placeId: "chIJe-travel-haramain"
        }
      );
    } else if (q.includes("resto") || q.includes("kuliner") || q.includes("makan") || q.includes("f&b") || q.includes("cafe")) {
      mockLeads.push(
        {
          name: "Resto Padang Sari Bundo Halal",
          location: "Yogyakarta",
          address: "Jl. Jend. Sudirman No.34, Gowongan, Kec. Jetis, Kota Yogyakarta, DIY 55233",
          category: "restaurant",
          rating: 4.6,
          userRatingsTotal: 1420,
          website: "https://saribundoyogya.id",
          phone: "628112233445",
          placeId: "chIJe-resto-saribundo"
        },
        {
          name: "Kopi Nusantara Syariah",
          location: "Semarang",
          address: "Jl. Pemuda No.150, Sekayu, Kec. Semarang Tengah, Kota Semarang, Jawa Tengah 50132",
          category: "cafe",
          rating: 4.4,
          userRatingsTotal: 310,
          website: "https://kopisyariah.com",
          phone: "628198765432",
          placeId: "chIJe-cafe-syariah"
        },
        {
          name: "Ayam Bakar Madu Barokah",
          location: "Bandung",
          address: "Jl. Gegerkalong Hilir No.82, Sukasari, Kota Bandung, Jawa Barat 40152",
          category: "restaurant",
          rating: 4.7,
          userRatingsTotal: 480,
          phone: "6285223344551",
          placeId: "chIJe-resto-ayamakar"
        }
      );
    } else if (q.includes("dinas") || q.includes("pemerintah") || q.includes("kominfo")) {
      mockLeads.push(
        {
          name: "Dinas Kominfo Provinsi Jawa Barat",
          location: "Bandung",
          address: "Jl. Tamansari No.55, Lb. Siliwangi, Kec. Coblong, Kota Bandung, Jawa Barat 40132",
          category: "government office",
          rating: 4.5,
          userRatingsTotal: 180,
          website: "https://diskominfo.jabarprov.go.id",
          phone: "62222502858",
          placeId: "chIJe-gov-diskominfo"
        },
        {
          name: "Dinas Koperasi dan UMKM",
          location: "Surabaya",
          address: "Jl. Raya Juanda No.22, Kec. Sidoarjo, Kabupaten Sidoarjo, Jawa Timur 61253",
          category: "government office",
          rating: 4.3,
          userRatingsTotal: 92,
          website: "https://diskopumkm.jatimprov.go.id",
          phone: "62318531234",
          placeId: "chIJe-gov-diskopumkm"
        }
      );
    } else {
      // General fallbacks
      mockLeads.push(
        {
          name: `${query} - Prospek Sukses A`,
          location: "Bandung",
          address: "Kawasan Bisnis Buah Batu, Bandung, Jawa Barat",
          category: "local business",
          rating: 4.8,
          userRatingsTotal: 150,
          website: "https://prospeksuksesa.com",
          phone: "6289999888877",
          placeId: "chIJe-gen-prospeka"
        },
        {
          name: `${query} - Prospek Hebat B`,
          location: "Jakarta",
          address: "Sudirman Central Business District, Jakarta Selatan",
          category: "corporate office",
          rating: 4.5,
          userRatingsTotal: 72,
          phone: "6289999888878",
          placeId: "chIJe-gen-prospekb"
        },
        {
          name: `${query} - Komunitas Muslim C`,
          location: "Depok",
          address: "Jl. Margonda Raya, Kota Depok, Jawa Barat",
          category: "association or organization",
          rating: 4.9,
          userRatingsTotal: 340,
          website: "https://komunitasmuslimc.org",
          phone: "6289999888879",
          placeId: "chIJe-gen-komunitasc"
        }
      );
    }
    
    return mockLeads.slice(0, limit);
  }


  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "id");

  const response = await fetch(url);
  const payload = await response.json() as {
    status: string;
    error_message?: string;
    results?: Array<{
      name: string;
      formatted_address?: string;
      place_id?: string;
      rating?: number;
      user_ratings_total?: number;
      types?: string[];
    }>;
  };

  if (payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
    throw new Error(payload.error_message ?? `Google Places returned ${payload.status}`);
  }

  return (payload.results ?? []).slice(0, limit).map((place) => ({
    name: place.name,
    location: place.formatted_address ?? "Indonesia",
    address: place.formatted_address,
    placeId: place.place_id,
    rating: place.rating,
    userRatingsTotal: place.user_ratings_total,
    category: place.types?.[0]?.replaceAll("_", " ") ?? "Google Places"
  }));
}
