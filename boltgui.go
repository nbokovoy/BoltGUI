package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/boltdb/bolt"
)

var (
	dbpath = "boltdb.db"
	curDir string
)

func main() {
	curDir, _ = filepath.Abs(filepath.Dir(os.Args[0]))
	fmt.Println(curDir)

	if len(os.Args) > 1 {
		dbpath = os.Args[1]
	} else {
		dbpath = curDir + "/" + dbpath
	}

	http.HandleFunc("/exit", exit)
	http.HandleFunc("/getBuckets", getBucketsHandler)
	http.HandleFunc("/getEntries", getEntriesHandler)
	http.HandleFunc("/delEntry", delEntryHandler)
	http.HandleFunc("/delBucket", delBucketHandler)
	http.HandleFunc("/setEntry", setEntryHandler)
	http.HandleFunc("/setBucket", setBucketHandler)

	http.Handle("/", http.FileServer(http.Dir(curDir+"/html")))
	http.ListenAndServe(":8080", nil)
}

func delEntryHandler(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	delEntry(r.FormValue("bucket"), r.FormValue("key"))
}

func delBucketHandler(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	delBucket(r.FormValue("bucket"))
}

func setEntryHandler(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	setEntry(r.FormValue("bucket"), r.FormValue("key"), r.FormValue("value"))
}

func setBucketHandler(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	setBucket(r.FormValue("bucket"))
}

func getBucketsHandler(w http.ResponseWriter, r *http.Request) {
	buckets := getBuckets()

	js, err := json.Marshal(buckets)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(js)
}

func getEntriesHandler(w http.ResponseWriter, r *http.Request) {
	entries := getEntries(r.URL.Query().Get("buck"))

	js, err := json.Marshal(entries)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(js)
}

func exit(w http.ResponseWriter, r *http.Request) {
	os.Exit(0)
}

func delEntry(bucket, key string) {
	db, err := bolt.Open(dbpath, 0600, nil)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	err = db.Update(func(tx *bolt.Tx) error {
		buck := tx.Bucket([]byte(bucket))
		return buck.Delete([]byte(key))
	})

	if err != nil {
		panic(err)
	}
}

func delBucket(bucket string) {
	db, err := bolt.Open(dbpath, 0600, nil)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	err = db.Update(func(tx *bolt.Tx) error {
		return tx.DeleteBucket([]byte(bucket))
	})

	if err != nil {
		panic(err)
	}
}

func setEntry(bucket, key, value string) {
	db, err := bolt.Open(dbpath, 0600, nil)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	err = db.Update(func(tx *bolt.Tx) error {
		buck := tx.Bucket([]byte(bucket))
		return buck.Put([]byte(key), []byte(value))
	})

	if err != nil {
		panic(err)
	}
}

func setBucket(bucket string) {
	db, err := bolt.Open(dbpath, 0600, nil)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	err = db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucket([]byte(bucket))
		return err
	})

	if err != nil {
		panic(err)
	}
}

func getEntries(bucket string) map[string]string {
	db, err := bolt.Open(dbpath, 0600, nil)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	entriesMap := map[string]string{}

	db.View(func(tx *bolt.Tx) error {
		curBucket := tx.Bucket([]byte(bucket))

		curBucket.ForEach(func(k, v []byte) error {
			entriesMap[string(k)] = string(v)
			return nil
		})
		return nil
	})
	return entriesMap
}

func getBuckets() []string {
	db, err := bolt.Open(dbpath, 0600, nil)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	bucketsList := []string{}
	db.View(func(tx *bolt.Tx) error {
		tx.ForEach(func(name []byte, b *bolt.Bucket) error {
			bucketsList = append(bucketsList, string(name))
			return nil
		})
		return nil
	})
	return bucketsList
}
