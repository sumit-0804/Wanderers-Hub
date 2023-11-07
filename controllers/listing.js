const Listing = require("../models/listing.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding.js");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
  if (!req.query.q) {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
  } else {
    const allListings = await Listing.find({
      categories: { $in: req.query.q },
    });
    res.render("listings/index.ejs", { allListings });
  }
};

module.exports.newForm = (req, res) => {
  res.render("listings/new.ejs");
};
module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing you requested for does no exist");
    res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing, mapToken: process.env.MAP_TOKEN });
};

module.exports.createListing = async (req, res) => {
  let response = await geocodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();
  let url = req.file.path;
  let filename = req.file.filename;
  let categories = req.body.listing.categories;
  if (typeof categories == "object") {
    categories = categories.map((e) => e.toLowerCase());
  }
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };
  newListing.categories = categories;
  newListing.geometry = response.body.features[0].geometry;
  await newListing.save();
  req.flash("success", "New Listing Created");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does no exist");
    res.redirect("/listings");
  }
  let ogURL = listing.image.url;
  ogURL = ogURL.replace("/upload", "/upload/h_300,w_300");
  res.render("listings/edit.ejs", { listing, ogURL });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let response = await geocodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  let categories = req.body.listing.categories;
  if (typeof categories === "object") {
    categories = categories.map((e) => e.toLowerCase());
  }
  listing.categories = categories;
  listing.geometry = response.body.features[0].geometry;
  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
  }
  await listing.save();
  req.flash("success", "Listing Updated");
  res.redirect(`/listings/${id}`);
};

module.exports.deleteListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
