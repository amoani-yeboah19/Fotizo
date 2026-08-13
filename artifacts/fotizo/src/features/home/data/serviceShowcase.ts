import {
  serviceCategoryLabel,
  serviceGroupLabel,
  groupForCategory,
} from "@workspace/service-taxonomy";

// Cards for the home page "Explore services" carousel. Each entry is just a
// taxonomy category id plus artwork — the label, the group it belongs to and
// the link are all derived, so a category renamed in the taxonomy renames here
// too and the carousel can never advertise a category the filter doesn't have.
//
// The trade photographs are Creative Commons stand-ins (no free stock library
// carries Ghanaian trade photography); swap them for your own shoot when you
// have one. Credits, required by the BY licences:
//   barbering: "Lakeforest Elementary Haircuts" by Greenville, NC (pdm) — https://www.flickr.com/photos/156869144@N02/52444206925
//   hairdressing: "'Quick!! I need a model...'" by Jaako (by) — https://www.flickr.com/photos/56944727@N00/267975094
//   nail-tech: "Degradê" by Lelê Breveglieri (by) — https://www.flickr.com/photos/52215361@N02/7903657610
//   lash-tech: "facial" by Zenspa1 (by) — https://www.flickr.com/photos/93609956@N05/9865582355
//   makeup-artistry: "Makeup Design: Hair Laying/Ventilating/Wigs" by vancouverfilmschool (by) — https://www.flickr.com/photos/38174668@N05/4689344842
//   fashion-design: "Tailor threading a needle on a sewing machine" by Ivan Radic (by) — https://www.flickr.com/photos/26344495@N05/49482217643
//   plumbing: "mid-repair of a broken pipe" by rick (by) — https://www.flickr.com/photos/35034361412@N01/294035300
//   electrical: "Electrician Wiring Installation 308753 Edited 2020" by chimpwithcan (by) — https://www.flickr.com/photos/188454520@N02/49927472521
//   carpentry: "The carpenter's workshop" by Alan Cleaver (by) — https://www.flickr.com/photos/11121568@N06/2370612355
//   welding-fabrication: "welder" by tacit requiem (joanneQEscober ) (by) — https://www.flickr.com/photos/25854624@N02/7649438312
//   auto-mechanic: "Ian helping me get the engine installed" by wbaiv (by-sa) — https://www.flickr.com/photos/9998127@N06/4684156777
//   masonry: "Subway tile is most in" by juhansonin (by) — https://www.flickr.com/photos/38869431@N00/3770082127
//   painting-decorating: "27-12-06_1155" by Andre Queiroz (by) — https://www.flickr.com/photos/58513094@N00/1813415211
//   catering: "Chefs" by Tracy Hunter (by) — https://www.flickr.com/photos/11121785@N00/149041581
//   event-planning: "Yellow Theme Jarbara Flower Decoration at Acura BMK" by videek (pdm) — https://www.flickr.com/photos/193845755@N03/52080648047
//   cleaning-services: "Work" by TheeErin (by-nd) — https://www.flickr.com/photos/27073477@N00/1170662577
//   cobbling: "Close-up of a shoemaker stitching leather by hand" by Ivan Radic (by) — https://www.flickr.com/photos/26344495@N05/49482926232

const UNSPLASH = (id: string) => `https://images.unsplash.com/${id}?w=600&q=80&auto=format&fit=crop`;

export interface ShowcaseCategory {
  id: string;
  image: string;
  accent: string;
}

const SHOWCASE: ShowcaseCategory[] = [
  { id: "barbering", image: "https://live.staticflickr.com/65535/52444206925_668a4316ab_b.jpg", accent: "#2B1B12" },
  { id: "fashion-design", image: "https://live.staticflickr.com/65535/49482217643_6de3d5b587_b.jpg", accent: "#3D2B1F" },
  { id: "plumbing", image: "https://live.staticflickr.com/117/294035300_9ad54d2409_b.jpg", accent: "#123040" },
  { id: "graphic-design", image: UNSPLASH("photo-1626785774573-4b799315345d"), accent: "#0D2A4A" },
  { id: "hairdressing", image: "https://live.staticflickr.com/103/267975094_b1c7cc1d31_b.jpg", accent: "#1E1A2E" },
  { id: "carpentry", image: "https://live.staticflickr.com/2178/2370612355_dab1956a02_b.jpg", accent: "#3A2A18" },
  { id: "catering", image: "https://live.staticflickr.com/48/149041581_77a2fcbda1_b.jpg", accent: "#2E1F14" },
  { id: "nail-tech", image: "https://live.staticflickr.com/8177/7903657610_3f01c6bf8c_b.jpg", accent: "#3A2233" },
  { id: "web-development", image: UNSPLASH("photo-1461749280684-dccba630e2f6"), accent: "#1A1A2E" },
  { id: "electrical", image: "https://live.staticflickr.com/65535/49927472521_aa62814b08_b.jpg", accent: "#2A2410" },
  { id: "auto-mechanic", image: "https://live.staticflickr.com/4015/4684156777_4b6ff6b15a_b.jpg", accent: "#1F1F24" },
  { id: "event-planning", image: "https://live.staticflickr.com/65535/52080648047_2fc6e0250c_b.jpg", accent: "#3A1330" },
  { id: "lash-tech", image: "https://live.staticflickr.com/2888/9865582355_df71d00c02_b.jpg", accent: "#2A2438" },
  { id: "welding-fabrication", image: "https://live.staticflickr.com/7247/7649438312_7ef364fca4_b.jpg", accent: "#1A2430" },
  { id: "photography", image: UNSPLASH("photo-1502920917128-1aa500764cbd"), accent: "#1A3A2A" },
  { id: "makeup-artistry", image: "https://live.staticflickr.com/4016/4689344842_fafebeafc8_b.jpg", accent: "#3D1F2B" },
  { id: "painting-decorating", image: "https://live.staticflickr.com/2111/1813415211_59a7ced74a.jpg", accent: "#14304A" },
  { id: "cleaning-services", image: "https://live.staticflickr.com/1125/1170662577_1822defb71_b.jpg", accent: "#123A3A" },
  { id: "video-animation", image: UNSPLASH("photo-1574717024653-61fd2cf4d44d"), accent: "#3D1F0D" },
  { id: "masonry", image: "https://live.staticflickr.com/3457/3770082127_a46a76c981_b.jpg", accent: "#2C3038" },
  { id: "cobbling", image: "https://live.staticflickr.com/65535/49482926232_95f25f839c_b.jpg", accent: "#2E2118" },
  { id: "digital-marketing", image: UNSPLASH("photo-1611926653458-09294b3142bf"), accent: "#1E3A5F" },
  { id: "business-consulting", image: UNSPLASH("photo-1600880292203-757bb62b4baf"), accent: "#1A1A1A" },
  { id: "writing-translation", image: UNSPLASH("photo-1481627834876-b7833e8f5570"), accent: "#08275B" },
];

export interface ShowcaseCard extends ShowcaseCategory {
  label: string;
  group: string;
  groupLabel: string;
  href: string;
}

export const SHOWCASE_CARDS: ShowcaseCard[] = SHOWCASE.map((c) => {
  const group = groupForCategory(c.id);
  if (!group) throw new Error(`Showcase category is not in the taxonomy: ${c.id}`);
  return {
    ...c,
    label: serviceCategoryLabel(c.id),
    group,
    groupLabel: serviceGroupLabel(group),
    href: `/services?category=${c.id}`,
  };
});
