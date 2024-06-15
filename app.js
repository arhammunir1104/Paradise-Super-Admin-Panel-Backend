require("dotenv").config();
let express = require("express");
let app = express();
let PORT = process.env.PORT;
let db = require("./src/db/db")
let bodyParser = require('body-parser');
let multer = require("multer");
let path = require("path");
let hbs = require("hbs");
let verification = require("./src/middleware/verification");
let cors = require("cors")
let bcrypt = require("bcryptjs")
//Database
let HotelData = require("./src/models/HotelData");
let RoomData = require("./src/models/RoomData");
let UserData = require("./src/models/UserData");
let ReservationDetails = require("./src/models/ReservationDetails");

//Cors
let corsOptions = {
    origin: "https://paradise-super-admin.web.app",
    methods: "GET, POST, PUT, DELETE, PATCH, HEAD",
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin', ],
    creddentials: true,
}
app.use(cors(corsOptions))


// Middlewares 
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({extended: false}));
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(express.static(path.join(__dirname, 'public')));


//hbs
let tempPath = path.join(__dirname, "./src/template/")
app.set("view engine", "hbs")
app.set("views", tempPath)

// Multer storage Single hotel logo 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/hotellogos');
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`)
    }
  });
    
const upload = multer({ storage: storage })

// Multer storage Multiple (Room images)
const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images')
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`)
    }
  })
  
const upload2 = multer({ storage: storage2 })

//Routing

app.get("/", (req, res)=>{
    console.log("Response Sent");
    res.status(200).json("Hello world");
});

app.get("/dashboarddata", (req, res)=>{
    async function getData(){
        try{
            let hotelData= await HotelData.find({}).select({hotel_total_revenue : 1});
            let roomData = await RoomData.find().count();
            console.log(hotelData, roomData);
            let userData = await UserData.find().count();
            let total_Pending_reservations = await ReservationDetails.find({reservation_status : "pending"}).count();
            let total_Confirmed_reservations = await ReservationDetails.find({reservation_status : "confirmed"}).count();
            let total_Closed_reservations = await ReservationDetails.find({reservation_status : "closed"}).count();
            let total_Cancelled_reservations = await ReservationDetails.find({reservation_status : "cancelled"}).count();
            console.log(hotelData);
            console.log(roomData, userData, total_Pending_reservations, total_Confirmed_reservations, hotelData.length);
            let revenue = 0;
            hotelData.map((val, i)=>{
                console.log(val);
                revenue +=val.hotel_total_revenue;
            });
            let data = {
                total_hotels :  hotelData.length,
                total_rooms : roomData,
                total_users: userData,
                total_revenue : revenue,
                total_pending : total_Pending_reservations,
                total_confirmed : total_Confirmed_reservations,
                total_closed: total_Closed_reservations,
                total_cancelled : total_Cancelled_reservations
            }
            console.log(data);
            res.status(200).json({msg: "Fetched Data Successfully" ,data});    
        }
        catch(e){
            console.log("Errors while fatching dashboard data", e);
            res.status(400).json({msg : "Errors while fatching dashboard data"})
        }
    };
    getData();
})


app.post("/admin_verify", (req, res)=>{
    async function v(){
        let {token} = req.body;
        // console.log(token);
        // console.log(req.body);
        try{
            let verify = await verification({token: token});
            console.log(verify);
            
            if(verify.verified === true  || verify.verified){
                res.status(200).json({msg: "LoggedIn Successfully", verified: true, })
            }
            else{
                res.status(200).json({msg: "You are not Logged in , Please Login First", verified: false})

            }
        }
        catch(e){
            console.log("Verification Error", e);
        }
    };
    v();
});

// app.post("/login", (req, res)=>{
//     let {hotel_email, hotel_password} = req.body;
//     console.log(req.body);

//     async function userlogin(){
//         try{
//             let data = await HotelData.findOne({hotel_email: hotel_email});
//             if(data !== null){
//                 // console.log(data);
//                 let verify = await bcrypt.compare(hotel_password, data.hotel_password);
//                 if(verify === true || verify){
//                         let token = await data.generateAuthToken();
//                         // console.log("Login Token", token);
//                          res.status(200).json({verified : true, msg: "Login Successfully", token: token});
//                         // res.send("User Loggedin Successfully")

//                     // if(data.type === "admin"){
//                     //     let token = await data.generateAuthToken();
//                     //     console.log("Login Token", token);
//                     //      res.status(200).json({verified : true, msg: "Login Successfully", token: token});
//                     //     // res.send("User Loggedin Successfully")
//                     // }
//                     // else{
//                     //     res.send("Sorry you have not used admin email, kindly login with the admin email");
//                     // }
//                 }
//                 else{
//                     console.log("Wrong Email or password");
//                     res.send("Wrong Email or password");
//                 }

//             }
//             else{
//                 console.log("Account not found");
//                 res.send("Account not found");
//             }            
//         }
//         catch(e){
//             console.log("User Login Error", e);
//             return("User Login Error", e);
//         }
//     };
//     userlogin();
// });

app.post("/admin_login", (req, res)=>{
    let {email, password} = req.body;
    console.log(req.body);

    async function userlogin(){
        try{
            let data = await UserData.findOne({email: email});
            if(data !== null){
                console.log(data);
                let verify = await bcrypt.compare(password, data.password);
                if(verify === true || verify){
                    if(data.type === "admin"){
                        let token = await data.generateAuthToken();
                        console.log("Login Token", token);
                         res.status(200).json({verified : true, msg: "Login Successfully", token: token});
                        // res.send("User Loggedin Successfully")
                    }
                    else{
                        console.log("The provided account is not an admin account");
                        res.status(200).json({verified : false, msg: "The provided account is not an admin account", token: ""});
                        // res.send("Sorry you have not used admin email, kindly login with the admin email");
                    }
                }
                else{
                    console.log("Wrong Email or password");
                    res.status(200).json({verified : false, msg: "Wrong Email or password", token: ""});
                    // res.send("Wrong Email or password");
                }

            }
            else{
                console.log("Account not found");
                res.status(200).json({verified : false, msg: "Sorry! Your Account is not found, kindly use another account", token: ""});
                // res.send("Account not found");
            }            
        }
        catch(e){
            console.log("User Login Error", e);
            return("User Login Error", e);
        }
    };
    userlogin();
});

app.post("/logout", (req, res)=>{
    let {token} = req.body;
    console.log("Backend logout");
    // console.log(req.body);
    async function logout(){
        try{
            let verify = await verification({token: token});
            // console.log(verify);
            let delete_data = await UserData.findOne({_id: verify._id});
            // console.log(delete_data);
            let d = delete_data.tokens.filter((val)=>{
                if(val.token !== token){
                    return(val);
                }
            });
            console.log(d);
            let loggingout = await UserData.findByIdAndUpdate({_id: verify._id}, {
                $set: {
                    tokens: d
                }
            });
            // console.log(loggingout);
                res.status(200).json({msg: "Logged Out Successfully", logout: true}) //Checking if the data has been updated

        }
        catch(e){
            // res.status(200).json({msg: "Logging Out Error", logout: false})
            console.log("Logging out error", e);
        }
    };
    logout();

});



app.post("/createhotel", upload.single("hotel_logo") ,(req, res)=>{
    console.log(req);
    console.log(req.body);
    console.log(req.file);

    async function saveHotelData(){
        let hotel_logo = path.join(__dirname+"/public/hotellogos/"+req.file.filename);
        let hotel_name = req.body.hotel_name;
        let hotel_contact_no = req.body.hotel_contact_no;
        let hotel_email = req.body.hotel_email;
        let hotel_password = req.body.hotel_password;
        let hotel_city = req.body.hotel_city;
        let hotel_add = req.body.hotel_add;
        let hotel_des = req.body.hotel_des;
        // console.log( "Hotel logo" ,hotel_logo);
        // console.log("hotel name", hotel_name);
        try{
            let data = await HotelData.create({
                hotel_logo: hotel_logo,
                hotel_name: hotel_name,
                hotel_email: hotel_email,
                hotel_contact_no :hotel_contact_no,
                hotel_password : hotel_password,
                hotel_city :hotel_city,
                hotel_add : hotel_add,
                hotel_des : hotel_des
            });
            let token = await data.generateAuthToken();
            // console.log("Token in Backend", token); // Checking if token is retrieveing in backend 
            // console.log("Data Saved", data);  // Checking if data is saved in database
            res.status(201).json({msg: "Account Created Successfully", token : token, status: true,});
            // console.log(data);
            // res.send("Hotel Data Saved Successfully");
        }
        catch(e){
            console.log("Hotel Data saving error", e);
            res.status(201).json({msg: "Error while Creating Hotel Account", token : "", status: false});
        }
    };
    saveHotelData();
});

app.get("/createroom", (req, res)=>{
    res.render("upload")
})

app.post("/createroom" ,(req, res)=>{
    console.log(req.body);
    let room_title = req.body.room_title;
    let room_price = req.body.room_price;
    let room_dis_price = req.body.room_dis_price;
    let room_bed =  req.body.room_bed; 
    let room_type =req.body.room_type;
    let policy =req.body.room_policy.split("|");
    let room_policy = policy;
    let room_add = req.body.room_add;
    let room_des = req.body.room_des;

    async function saveRoomData(){
        try{
            // finding hotel data 
            let hotelData= await HotelData.findOne({_id: req.body.hotel_id});
            console.log(hotelData);

            //Saving hotel important datas into variable
            let hotel_id = req.body.hotel_id;
            let hotel_name = hotelData.hotel_name;
            let hotel_logo = hotelData.hotel_logo;
            let hotel_contact_no = hotelData.hotel_contact_no;
            let hotel_data = {
                hotel_id,
                hotel_name,
                hotel_logo,
                hotel_contact_no
            };
            
            //now creating a room collection and adding all required room data (getting from frontend) and hotel data
            let data = await RoomData.create({
                room_title: room_title,
                room_add : room_add,
                room_city : hotelData.hotel_city,
                room_price: room_price,
                room_dis_price: room_dis_price,
                room_policy: room_policy,
                room_bed: room_bed,
                room_type: room_type,
                room_des : room_des,
                hotel_data : hotel_data
            });
            hotelData.total_hotel_rooms = hotelData.total_hotel_rooms + 1;

            let room = {
                room_id: data._id,
                room_title: data.room_title,
                room_dis_price: data.room_dis_price,
                room_price: data.room_price,
                room_city: data.room_city,
                room_add: data.room_add,
                room_bed: data.room_bed,
                room_type : data.room_type,
                admin_access : data.admin_access,
                room_status : data.room_status
            }
            hotelData.hotel_rooms =  hotelData.hotel_rooms.concat(room);
           await hotelData.save();
            console.log("Room data", data);
            res.status(201).json({msg: "Room Created Successfully",room_id: data._id,  status: true,});
        }
        catch(e){
            console.log("Room Data saving error", e);
            res.status(201).json({msg: "Error while Creating Hotel Account",room_id: "", status: false});
        }
    };
    saveRoomData();
});



app.post("/uploadroomimage", 
upload2.fields([{name: "img1" }, {name: "img2" } , {name: "img3" }, {name: "img4" }, {name: "img5" }, {name: "img6" }])
,(req, res)=>{
    console.log(req.files);
    async function uploadImg(){
        try{   
            const room_id = req.body.room_id;
            console.log("PArams", room_id);
            let files = req.files;
            console.log(files);
            let main_img =  __dirname+"\\"+req.files.img1[0].path;
            let img_arr = [
                __dirname+"\\"+req.files.img1[0].path,
                __dirname+"\\"+req.files.img2[0].path,
                __dirname+"\\"+req.files.img3[0].path,
                __dirname+"\\"+req.files.img4[0].path,
                __dirname+"\\"+req.files.img5[0].path,
                __dirname+"\\"+req.files.img6[0].path,
            ]
            console.log(img_arr);
            let data = await RoomData.findByIdAndUpdate({_id: room_id}, {
                $set:{
                    room_main_img : main_img,
                    room_images : img_arr,
                }
            });
            console.log( "Room Data" ,data);
            let hotel_data = await HotelData.findOne({_id: data.hotel_data[0].hotel_id});
            console.log( "Hotel Data" ,hotel_data);
            let rooms= hotel_data.hotel_rooms;
            console.log(room_id, " ", req.body.room_id);
            let d = rooms.map((val)=>{
                if(val.room_id === room_id){
                    val.room_pic = main_img;
                    return(val);
                }
                else{
                    return(val)
                }
            });
            hotel_data.hotel_rooms  = d;
            await hotel_data.save();
            res.status(201).json({msg: "Room Images Saved", status: true,});

        }
        catch(e){
            console.log("Image uploading error", e);
            res.status(201).json({msg: "Saving Room Images Unsuccessfull", status: false,});
        }
    };
    uploadImg()
});


app.get("/find/hotels", (req, res)=>{
    async function findHotels(){
        try{
            let data = await HotelData.find({}).select({hotel_rooms: 0, tokens: 0}).sort({ creationData: -1 });;
            console.log(data);
            // res.send(`Total Hotels Found ${data.length}`);
            res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true})
        }
        catch(e){
            console.log("Hotels Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false})
        }
    };
    findHotels();
});

app.get("/f/hotel/:id", (req, res)=>{
    let id = req.params.id;
    console.log(id);
    async function findRooms(){
        try{
            let data = await HotelData.findOne({_id : id});
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Hotel Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findRooms();
});


app.post("/hotel/change/", (req, res)=>{
    async function changeStatus(){
        let {admin_access, hotel_id} = req.body;
        try{
            if(admin_access === "restricted"){
                let updateData = await HotelData.findByIdAndUpdate({_id: hotel_id}, {
                    $set: {admin_access : "active"}
                })
                let updateRoomAccess = await RoomData.updateMany({hotel_id : hotel_id}, {
                    $set: {admin_access : "active"}
                })
                console.log(updateData);
                res.status(200).json({status:true, current_access: "active" });
            }
            else{
                let updateData = await HotelData.findByIdAndUpdate({_id: hotel_id}, {
                    $set: {admin_access : "restricted"}
                })
                
                let updateRoomAccess = await RoomData.updateMany({hotel_id : hotel_id}, {
                    $set: {admin_access : "restricted"}
                })
                console.log(updateData);
                res.status(200).json({status:true, current_access: "restricted" });
            }
        }
        catch(e){
            console.log("Hotel Statuss Chengin Error", e);
            res.status(400).json({status:false, current_access: "" });
        }
    };
    changeStatus();
});

app.get("/find/rooms", (req, res)=>{
    async function findRooms(){
        try{
            let data = await RoomData.find({}).select({room_policy: 0, room_des: 0, room_images: 0, reservationDetails: 0 }).sort({ creationData: -1 });;
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            }
        }
        catch(e){
            console.log("Rooms Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findRooms();
});

app.post("/room/change/", (req, res)=>{
    async function changeStatus(){
        let {admin_access, room_id} = req.body;
        try{
            if(admin_access === "restricted"){
                let updateData = await RoomData.findByIdAndUpdate({_id: room_id}, {
                    $set: {admin_access : "active"}
                })
                console.log(updateData);
                res.status(200).json({status:true, current_access: "active" });
            }
            else{
                let updateData = await RoomData.findByIdAndUpdate({_id: room_id}, {
                    $set: {admin_access : "restricted"}
                })
                console.log(updateData);
                res.status(200).json({status:true, current_access: "restricted" });
            }
        }
        catch(e){
            console.log("Room Status Chengin Error", e);
            res.status(400).json({status:false, current_access: "" });
        }
    };
    changeStatus();
});


app.get("/f/room/:id", (req, res)=>{
    let id = req.params.id;
    console.log(id)
    async function findRooms(){
        try{
            let data = await RoomData.findOne({_id : id});
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Hotel Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findRooms();
});




app.get("/find/users", (req, res)=>{
    async function findUsers(){
        try{
            let data = await UserData.find();
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Users Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findUsers();
});

app.post("/user/change/", (req, res)=>{
    async function changeStatus(){
        let {admin_access, user_id} = req.body;
        console.log(req.body);
        try{
            if(admin_access === "restricted"){
                let updateData = await UserData.findByIdAndUpdate({_id: user_id}, {
                    $set: {admin_access : "active"}
                })
                console.log(updateData);
                res.status(200).json({status:true, current_access: "active" });
            }
            else{
                let updateData = await UserData.findByIdAndUpdate({_id: user_id}, {
                    $set: {admin_access : "restricted"}
                })
                console.log(updateData);
                res.status(200).json({status:true, current_access: "restricted" });
            }
        }
        catch(e){
            console.log("Room Status Chengin Error", e);
            res.status(400).json({status:false, current_access: "" });
        }
    };
    changeStatus();
});



app.get("/pendingreservation", (req, res)=>{
    async function findPendingReservation(){
        console.log("Requested");
        try{
            let data = await ReservationDetails.find({reservation_status : "pending"}).sort({ creationData: 1 });
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Pending Reservation Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findPendingReservation();
});
app.get("/confirmedreservation", (req, res)=>{
    async function findConfirmReservation(){
        try{
            let data = await ReservationDetails.find({reservation_status : "confirmed"}).sort({ creationData: 1 });;
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Confirmed Reservation Data Found Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findConfirmReservation();
});
app.get("/closereservation", (req, res)=>{
    async function findCloseReservation(){
        try{
            let data = await ReservationDetails.find({reservation_status : "closed"}).sort({ creationData: 1 });;
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Hotel Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findCloseReservation();
});
app.get("/cancelreservation", (req, res)=>{
    async function findCancelReservation(){
        try{
            let data = await ReservationDetails.find({reservation_status : "cancelled"}).sort({ creationData: 1 });;
            console.log(data);
            if(data === null){
                res.status(200).json({msg: "No Data Found"  ,data: [], status: false});
            }
            else{
                res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
            };
        }
        catch(e){
            console.log("Hotel Data Fetching Error", e);
            res.status(200).json({msg: "Data Fetched UnSuccessfully"  ,data: [], status: false});
        }
    };
    findCancelReservation();
});
app.get("/reservations/:reservation_type/:query_type/:query", (req, res)=>{
    async function findReservations(){
        let {reservation_type, query_type, query} = req.params;
        try{
            if(reservation_type === "all"){
                let data = await ReservationDetails.find({});
                console.log(data);
                res.send(`Reservation data found ${data.length}`);
            }
            else if(reservation_type === "pending" ||reservation_type === "confirmed" ||reservation_type === "closed" || reservation_type === "cancelled"){
                if(query_type === "reservation_id"){
                    let data = await ReservationDetails.find({$and: [{reservation_status : reservation_type}, {_id: query}]});
                    console.log(data);
                    res.send(`Data Found For Pending Reservation by Reservation Id ${data.length}`);
                }
                else if (query_type === "user_id"){
                    let data = await ReservationDetails.find({$and: [{reservation_status : reservation_type}, {user_id: query}]});
                    console.log(data);
                    res.send(`Data Found For Pending Reservation by Reservation Id ${data.length}`);

                }
                else if(query_type === "user_name"){
                    let data = await ReservationDetails.find({$and: [{reservation_status : reservation_type}, {user_name: query}]});
                    console.log(data);
                    res.send(`Data Found For Pending Reservation by Reservation Id ${data.length}`);

                }
                else if(query_type === "user_cnic"){
                    let data = await ReservationDetails.find({$and: [{reservation_status : reservation_type}, { user_cnic: query}]});
                    console.log(data);
                    res.send(`Data Found For Pending Reservation by Reservation Id ${data.length}`);
                }
                else{
                    req.send("No Data Fount, Try aNother Search");
                }
                

            }
        }
        catch(e){
            console.log("Users Data Fetching Error", e);
        }
    };
    findReservations();
});


app.post("/confirmreservation", (req, res)=>{
    async function confirmReservation(){
        let {room_id ,reservation_id, } = req.body;
        console.log(req.body);
        try{
            let reservation = await ReservationDetails.findByIdAndUpdate({_id: reservation_id}, {
                $set: {
                    reservation_status : "confirmed"
                }
            });
            console.log(reservation);
            let room = await RoomData.findOne({_id: room_id});
            room.reservationDetails.filter((val, i)=>{
                if(val._id === reservation_id){
                    val.reservation_status = "confirmed";
                    return(val);
                }
                else{
                    return(val)
                }
            });
            room.room_total_revenue+=reservation.total_price;
            let hotelData = await HotelData.findOne({_id: room.hotel_data[0].hotel_id});
            hotelData.hotel_total_revenue +=  reservation.total_price;
            await room.save();
            await hotelData.save();
            res.status(200).json({msg: "Room has been Confirmed" , status: true});
        }
        catch(e){
            console.log("Error, while confirming reservation.", e);
            res.status(200).json({msg: "Some Error Occured while confirming the reservation" , status: false});
        }
    };
    confirmReservation();
});

app.post("/cancelreservation", (req, res)=>{
    async function cancelReservation(){
        let {room_id ,reservation_id , current_status} = req.body;
        console.log(req.body);
        try{
            if(current_status === "confirmed"){
                let reservation = await ReservationDetails.findByIdAndUpdate({_id: reservation_id}, {
                    $set: {
                        reservation_status : "cancelled"
                    }
                });
                console.log(reservation);
                let room = await RoomData.findOne({_id: room_id});
                console.log(room);
                let r = room.reservationDetails.filter((val, i)=>{
                    if(val._id !== reservation_id){
                        console.log("Yes");
                        return(val);
                    }
                    else{
                        return(0)
                    }
                });
                console.log(r);
                let total_revenue = room.room_total_revenue;
                total_revenue -= reservation.total_price;
                let reservationcancelled = await RoomData.findByIdAndUpdate({_id: room_id}, {
                    $set: {
                        reservationDetails: r,
                        room_total_revenue: total_revenue
                    }
                });
                console.log(reservationcancelled);
                let hotelData = await HotelData.findOne({_id: room.hotel_data[0].hotel_id});
                hotelData.hotel_total_revenue -=  reservation.total_price;
                await hotelData.save();
                res.status(200).json({msg: "Room has been Confirmed" , status: true});
            }
            else{
                let reservation = await ReservationDetails.findByIdAndUpdate({_id: reservation_id}, {
                    $set: {
                        reservation_status : "cancelled"
                    }
                });
                console.log(reservation);
                let room = await RoomData.findOne({_id: room_id});
                console.log(room);
                let r = room.reservationDetails.filter((val, i)=>{
                    if(val._id !== reservation_id){
                        return(val);
                    }
                    else{
                        return(0)
                    }
                });
                console.log(r);
                let reservationcancelled = await RoomData.findByIdAndUpdate({_id: room_id}, {
                    $set: {
                        reservationDetails: r
                    }
                });
                console.log(reservationcancelled);
                res.status(200).json({msg: "Room has been Confirmed" , status: true});

            }
            
        }
        catch(e){
            console.log("Error, while Cancelling reservation.", e);
            res.status(200).json({msg: "Some Error Occured while confirming the reservation" , status: false});

        }
    };
    cancelReservation();
});

app.post("/closereservation", (req, res)=>{
    async function closeReservation(){
        let {room_id ,reservation_id } = req.body;
        try{
            let reservation = await ReservationDetails.findByIdAndUpdate({_id: reservation_id}, {
                $set: {
                    reservation_status : "closed"
                }
            });
            console.log(reservation);
            let room = await RoomData.findOne({_id: room_id});
            let r = room.reservationDetails.filter((val, i)=>{
                if(val._id !== reservation_id){
                    return(val);
                }
                else{
                    return(0)
                }
            });
            // await room.save();
            console.log(r.length);
            let reservationcancelled = await RoomData.findByIdAndUpdate({_id: room_id}, {
                $set: {
                    reservationDetails: r
                }
            });
            console.log(reservationcancelled);
            res.status(200).json({msg: "Room has been Closed" , status: true});
        }
        catch(e){
            console.log("Error, while Closing the reservation.", e);
            res.status(200).json({msg: "Some Error Occured while Closing the reservation" , status: false});

        }
    };
    closeReservation();
});

app.post('/search', (req, res)=>{
    let {type, query, query_type} = req.body;
    console.log(req.body);
    async function search(){
        try{
            if(type === "hotels"){
                if(query_type === "id"){
                    let data = await HotelData.find({_id : query}).select({hotel_rooms: 0, tokens: 0});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "name"){
                    let q = query.toLowerCase();
                    let data = await HotelData.find({hotel_name : q}).select({hotel_rooms: 0, tokens: 0});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else{
                    let q = query.toLowerCase();
                    let data = await HotelData.find({hotel_city : q}).select({hotel_rooms: 0, tokens: 0});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
            }
            else if(type === "rooms"){
                if(query_type === "id"){
                    let data = await   RoomData.find({_id : query}).select({room_policy: 0, room_des: 0, room_images: 0, reservationDetails: 0 });
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else{
                    let q = query.toLowerCase();
                    let data = await   RoomData.find({room_city : q}).select({room_policy: 0, room_des: 0, room_images: 0, reservationDetails: 0 });
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }

            }
            else if(type === "users"){
                if(query_type === "id"){
                    let data = await UserData.find({_id : query});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "name"){
                    let q = query.toLowerCase();
                    console.log(q);
                    let data = await UserData.find({name : {$regex: q}}).select({hotel_rooms: 0, tokens: 0});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else{
                    let q = query.toLowerCase();
                    let d = await ReservationDetails.find({_id : q}).select({user_id : 1});
                    console.log(d);
                    let data = await UserData.find({_id: d[0].user_id});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }

            }
            else{
                console.log("Error, please search again!")
            }
        }
        catch(e){
            console.log("Error while searching data", e);
        }
    };
    search();
});


app.post('/search/reservations', (req, res)=>{
    let {type, query, query_type} = req.body;
    console.log(req.body);
    async function searchReservations(){
        try{
            if(type === "pending"){
                if(query_type === "reservation_id"){
                    let data = await ReservationDetails.find({$and: [{reservation_status : "pending"}, {_id: query}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "user_id"){
                    let data = await ReservationDetails.find( {$and: [{reservation_status : "pending"},{user_id : query}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else if(query_type === "user_name"){
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{reservation_status : "pending"},{user_name : {$regex: q}}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else{
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{reservation_status : "pending"},{user_cnic : q}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
            }

            //Confirm Reservation Search
            else if(type === "confirm"){
                if(query_type === "reservation_id"){
                    let data = await ReservationDetails.find({$and: [{reservation_status : "confirmed"}, {_id: query}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "user_id"){
                    let data = await ReservationDetails.find( {$and: [{reservation_status : "confirmed"},{user_id : query}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else if(query_type === "user_name"){
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{reservation_status : "confirmed"},{user_name : {$regex: q}}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else{
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{reservation_status : "confirmed"},{user_cnic : q}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
            }

            //Close Reservation Search
            else if(type === "close"){
                if(query_type === "reservation_id"){
                    let data = await ReservationDetails.find({$and: [{reservation_status : "closed"}, {_id: query}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "user_id"){
                    let data = await ReservationDetails.find( {$and: [{reservation_status : "closed"},{user_id : query}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else if(query_type === "user_name"){
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{reservation_status : "closed"},{user_name : {$regex: q}}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else{
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{reservation_status : "closed"},{user_cnic : q}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
            }

            //Cancel Reservation Search
            else if(type === "cancel"){
                if(query_type === "reservation_id"){
                    let data = await ReservationDetails.find({$and: [{reservation_status : "cancelled"}, {_id: query}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }
                }
                else if(query_type === "user_id"){
                    let data = await ReservationDetails.find( {$and: [{reservation_status : "cancelled"},{user_id : query}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else if(query_type === "user_name"){
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{reservation_status : "cancelled"},{user_name : {$regex: q}}]});
                    console.log(data);
                    if(data === null || data.length === 0 || data.length < 1 ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
                else{
                    let q = query.toLowerCase();
                    let data = await ReservationDetails.find({$and: [{reservation_status : "cancelled"},{user_cnic : q}]});
                    if(data === null || data.length === 0 || data.length < 1  ){
                        console.log("Data fetched , no data found", data.length);
                        res.status(200).json({msg: "No Data Found"  ,data: [], status: true});
                    }
                    else{
                        console.log("Data fetched Successfully", data.length);
                        res.status(200).json({msg: "Data Fetched Successfully"  ,data: data, status: true});
                    }

                }
            }
            //Cancel Reservation Closed


            else{
                console.log("Error, please search for Reservation again!")
            }
        }
        catch(e){
            console.log("Error while searching data", e);
        }
    };
    searchReservations();
});



app.listen(PORT, ()=>{
    console.log(`Server is active on port ${PORT}`);
})