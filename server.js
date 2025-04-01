const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');

const app = express();
app.use(express.json());
app.set('port', 3000);

function logActivity(activity, details = "") {
    const time = new Date();
    const formattedTime = time.toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  
    const logMessage = `[${formattedTime}] ${activity}${details ? ` | ${details}` : ""}`;
    console.log(logMessage);
  }

// CORS Middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
    next();
});

MongoClient.connect('mongodb+srv://AJDC6534:fullstack@cluster-afterschoolacti.qqzgrz9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster-AfterSchoolActivities',)
    .then(client => {
        db = client.db('webstore');
        logActivity("Connected to MongoDB successfully!");
        app.listen(app.get('port'), () => {
            logActivity(`Express.js server running at http://localhost:${app.get('port')}`);
        });
    })
    .catch(err => {
        logActivity("Error connecting to MongoDB:", err);
        process.exit(1); // Exit process if DB connection fails
    });

// Middleware to Validate and Attach Collection
app.param('collectionName', async (req, res, next, collectionName) => {
    try {
        if (!db) {
            return res.status(500).send({ error: 'Database connection not established' });
        }

        // Check if the collection exists in the database
        const collections = await db.listCollections().toArray();
        const collectionExists = collections.some(col => col.name === collectionName);

        if (!collectionExists) {
            return res.status(404).send({ error: `Collection '${collectionName}' not found!` });
        }

        req.collection = db.collection(collectionName);
        return next();
    } catch (err) {
        logActivity("❌ Error in param handling:", err);
        return res.status(500).send({ error: "Error while processing the collection name!" });
    }
});


// Fetch All Documents
app.get('/collection/:collectionName', async (req, res, next) => {
    try {
        if (!db) return res.status(500).send({ error: "Database not connected!" });

        logActivity("🟢 Fetching collection:", req.params.collectionName);
        const collection = db.collection(req.params.collectionName);

        const results = await collection.find({}).maxTimeMS(5000).toArray(); // Add timeout
        logActivity("✅ Data fetched successfully:", results);
        res.send(results);
    } catch (err) {
        logActivity("❌ Timeout/Error fetching data:", err);
        res.status(500).send({ error: "Database request timed out!" });
    }
});

// Insert a Document
app.post('/collection/:collectionName', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: "Database not connected!" });
        }

        logActivity("🟢 Received data for insertion:", req.body);

        const collection = db.collection(req.params.collectionName);
        const result = await collection.insertOne(req.body);

        // Access the inserted document directly from the result
        const insertedDocument = result.ops ? result.ops[0] : result; // For MongoDB v4.x or newer

        logActivity("✅ Document inserted:", insertedDocument);
        res.status(201).send(insertedDocument); // Send the inserted document back
    } catch (err) {
        logActivity("❌ Error inserting document:", err);
        res.status(500).send({ error: "Failed to insert document!" });
    }
});

// Get Document by ID
const { ObjectId } = require('mongodb');  // Correct import

app.get('/collection/:collectionName/:id', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: 'Database not connected!' });
        }

        const { collectionName, id } = req.params;
        logActivity("🟢 Fetching document from collection:", collectionName);
        logActivity("🔍 Document ID:", id);

        // Convert the string ID to an ObjectId
        const objectId = new ObjectId(id);  // Correct usage of ObjectId

        const collection = db.collection(collectionName);
        const result = await collection.findOne({ _id: objectId });

        if (!result) {
            console.warn("⚠️ Document not found.");
            return res.status(404).send({ error: 'Document not found!' });
        }

        logActivity("✅ Document fetched:", result);
        res.send(result);
    } catch (err) {
        logActivity("❌ Error fetching document:", err);
        res.status(500).send({ error: 'Failed to fetch document!' });
    }
});


// Update Document by ID
app.put('/collection/:collectionName/:id', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: "Database not connected!" });
        }

        const { collectionName, id } = req.params;
        logActivity("🟢 Updating document in collection:", collectionName);
        logActivity("🔍 Document ID:", id);

        // Convert the string ID to an ObjectId
        const objectId = new ObjectId(id);  // Correct usage of ObjectId

        const collection = db.collection(collectionName);

        // Prepare the update fields (filter out any null or undefined values)
        const updateFields = {};

        for (const key in req.body) {
            if (req.body[key] !== null && req.body[key] !== undefined) {
                updateFields[key] = req.body[key];
            }
        }

        // If no valid fields to update, return an error
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).send({ error: "No valid fields to update" });
        }

        // Use the updateOne method to update the document
        const result = await collection.updateOne(
            { _id: objectId },  // Find the document by _id
            { $set: updateFields }   // Update the document with valid data
        );

        // Check if a document was matched and updated
        if (result.matchedCount === 0) {
            console.warn("⚠️ No document found with the provided ID.");
            return res.status(404).send({ error: "Document not found!" });
        }

        logActivity("✅ Document updated:", result);
        res.send({ msg: 'success', updatedCount: result.modifiedCount });
    } catch (err) {
        logActivity("❌ Error updating document:", err);
        res.status(500).send({ error: "Failed to update document!" });
    }
});


// Delete Document by ID

app.delete('/collection/:collectionName/:id', async (req, res, next) => {
    try {
        if (!db) {
            return res.status(500).send({ error: "Database not connected!" });
        }

        const { collectionName, id } = req.params;
        logActivity("🟢 Deleting document from collection:", collectionName);
        logActivity("🔍 Document ID:", id);

        // Convert the string ID to an ObjectId
        const objectId = new ObjectId(id);  // Correct usage of ObjectId

        const collection = db.collection(collectionName);

        // Use the deleteOne method to delete the document
        const result = await collection.deleteOne({ _id: objectId });

        // Check if the document was deleted
        if (result.deletedCount === 0) {
            console.warn("⚠️ No document found with the provided ID.");
            return res.status(404).send({ error: "Document not found!" });
        }

        logActivity("✅ Document deleted:", result);
        res.send({ msg: 'success', deletedCount: result.deletedCount });
    } catch (err) {
        logActivity("❌ Error deleting document:", err);
        res.status(500).send({ error: "Failed to delete document!" });
    }
});

        //search as u type function
        app.get("/log-search", async (req, res) => {
            try {
                if (!db) {
                    logActivity("Error", "Database not connected!");
                    return res.status(500).send({ msg: "Database not connected!" });
                }
        
                const searchQuery = req.query.query?.trim();
                if (!searchQuery) {
                    logActivity("Warning", "Search query is missing in the request parameters");
                    return res.status(400).send({ msg: "Search query is required" });
                }
        
                logActivity("Info", `Search activity recorded: ${searchQuery}`);
        
                // Ensure the query is only looking for title and location
                const results = await db.collection("products").find({
                    $or: [
                        { title: { $regex: searchQuery, $options: "i" } },   // Search for 'title'
                        { location: { $regex: searchQuery, $options: "i" } }  // Search for 'location'
                    ]
                }).toArray();
        
                logActivity("Info", `Search results for '${searchQuery}': ${results.length} items found`);
                res.send(results);
            } catch (error) {
                logActivity("Error", `Error fetching search results: ${error.message}`);
                res.status(500).send({ msg: "Error fetching search results" });
            }
        });
        
          
        
        
        
        
        

