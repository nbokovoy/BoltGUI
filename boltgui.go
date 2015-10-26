package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/boltdb/bolt"
	msgpack "gopkg.in/vmihailenco/msgpack.v2"
)

const (
	delimiter = "--"
)

var (
	curDir string

	port   = flag.String("port", "8080", "Set port for server.")
	dbpath = flag.String("path", "path-to-db", "Set path to bolt db file.")
	coding = flag.String("coding", "text", "Type of value encding [text, mspack]")
)

func main() {
	curDir, _ = filepath.Abs(filepath.Dir(os.Args[0]))
	flag.Parse()

	if *dbpath == "path-to-db" {
		fmt.Print("Parameter -path must be set")
		flag.Usage()
		return
	}

	http.HandleFunc("/exit", exit)
	http.HandleFunc("/getBuckets", getBucketsHandler)
	http.HandleFunc("/getEntries", getEntriesHandler)
	http.HandleFunc("/delEntry", delEntryHandler)
	http.HandleFunc("/delBucket", delBucketHandler)
	http.HandleFunc("/setEntry", setEntryHandler)
	http.HandleFunc("/setBucket", setBucketHandler)

	http.Handle("/", http.FileServer(Dir(false, "/html")))
	//http.Handle("/", http.FileServer(http.Dir("html")))

	http.ListenAndServe(":"+*port, nil)
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
	db := getDb()
	defer db.Close()

	err := db.Update(func(tx *bolt.Tx) error {
		buck, err := getBucketByFullName(bucket, tx)
		if err != nil {
			return err
		}

		return buck.Delete([]byte(key))
	})

	if err != nil {
		panic(err)
	}
}

func delBucket(fullName string) {
	db := getDb()
	defer db.Close()

	err := db.Update(func(tx *bolt.Tx) error {
		fullName = strings.TrimPrefix(fullName, "list--")
		bucketChain := strings.Split(fullName, delimiter)

		if len(bucketChain) < 1 {
			return errors.New("empty bucket list")
		}

		var (
			buck        = &bolt.Bucket{}
			deletingKey string
		)

		if len(bucketChain) == 1 {
			return tx.DeleteBucket([]byte(bucketChain[0]))
		}

		for i, bucketName := range bucketChain {
			switch {
			case i == 0: //first level bucket get from tx
				buck = tx.Bucket([]byte(bucketName))
			case i == len(bucketChain)-1: // save name of last bucket in chain and parent it's parent bucket
				deletingKey = bucketName
			default:
				if buck == nil {
					return errors.New("Bucket not found.")
				}
				buck = buck.Bucket([]byte(bucketName))
			}

		}

		return buck.DeleteBucket([]byte(deletingKey))
	})

	if err != nil {
		panic(err)
	}
}

func setEntry(bucket, key, value string) {
	db := getDb()
	defer db.Close()

	err := db.Update(func(tx *bolt.Tx) error {
		buck, err := getBucketByFullName(bucket, tx)
		if err != nil {
			return err
		}

		return buck.Put([]byte(key), encodeEntry(value))
	})

	if err != nil {
		panic(err)
	}
}

func setBucket(bucket string) {
	db := getDb()
	defer db.Close()

	err := db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucket([]byte(bucket))
		return err
	})

	if err != nil {
		panic(err)
	}
}

func getEntries(bucketName string) Bucket {
	db := getDb()
	defer db.Close()

	resultBucket := Bucket{
		Name:       bucketName,
		Subbuckets: []Bucket{},
		Entries:    []Entry{},
	}

	db.View(func(tx *bolt.Tx) error {
		curBucket := tx.Bucket([]byte(bucketName))

		resultBucket.fill(curBucket)
		return nil
	})
	return resultBucket
}

func getBuckets() []string {
	db := getDb()
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

func getDb() *bolt.DB {
	db, err := bolt.Open(*dbpath, 0600, nil)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	return db
}

type Entry struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// Bucket TODO
type Bucket struct {
	Name       string   `json:"name"`
	Subbuckets []Bucket `json:"subbuckets"`
	Entries    []Entry  `json:"entries"`
}

func (b *Bucket) fill(bucket *bolt.Bucket) {
	//fmt.Println("Fill bucket ", bucket.Root())
	//fill subbuckets
	// bucket.Tx().ForEach(func(name []byte, buck *bolt.Bucket) error {
	// 	fmt.Println("subbucket ", string(name))
	// 	subbuck := Bucket{
	// 		Name: string(name),
	// 	}
	// 	fmt.Println("start fill ", string(name))
	// 	subbuck.fill(buck)

	// 	b.Subbuckets = append(b.Subbuckets, subbuck)
	// 	return nil
	// })

	//fill entries
	bucket.ForEach(func(k, v []byte) error {
		if len(v) == 0 { //subbucket
			sb := bucket.Bucket(k)
			if sb == nil {
				b.Entries = append(b.Entries, Entry{string(k), string(v)})
				return nil
			}

			subbuck := Bucket{
				Name:       string(k),
				Subbuckets: []Bucket{},
				Entries:    []Entry{},
			}
			subbuck.fill(sb)

			b.Subbuckets = append(b.Subbuckets, subbuck)

		} else {
			b.Entries = append(b.Entries, decodeEntry(k, v))
		}
		return nil
	})
}

func encodeEntry(value string) []byte {
	switch *coding {

	case "text":
		return []byte(value)
	case "mspack":
		var v interface{}

		err := json.Unmarshal([]byte(value), &v)
		if err != nil {
			log.Println(err)
		}

		b, err := msgpack.Marshal(v)
		if err != nil {
			log.Println(err)
		}

		return b
	}

	return nil
}

func decodeEntry(key, value []byte) Entry {
	switch *coding {

	case "text":
		return Entry{
			Key:   string(key),
			Value: string(value),
		}
	case "mspack":
		var v interface{}

		err := msgpack.Unmarshal(value, &v)
		if err != nil {
			log.Println(err)
		}

		switch value := v.(type) {

		case map[interface{}]interface{}:
			v = toStringMap(value)
		}

		b, err := json.Marshal(v)
		if err != nil {
			log.Println(err)
		}

		return Entry{
			Key:   string(key),
			Value: string(b),
		}
	}

	return Entry{}
}

func getBucketByFullName(fullName string, tx *bolt.Tx) (*bolt.Bucket, error) {
	fullName = strings.TrimPrefix(fullName, "list--")
	bucketChain := strings.Split(fullName, delimiter)
	if len(bucketChain) < 1 {
		return nil, errors.New("empty bucket list")
	}

	buck := &bolt.Bucket{}

	for i, bucketName := range bucketChain {
		if i == 0 { //first level bucket get from tx
			buck = tx.Bucket([]byte(bucketName))
		} else { //else serch for subbucket
			if buck == nil {
				return nil, errors.New("Bucket not found.")
			}
			buck = buck.Bucket([]byte(bucketName))
		}
	}
	return buck, nil
}

func toStringMap(source map[interface{}]interface{}) map[string]interface{} {
	var result = map[string]interface{}{}

	for k, v := range source {
		strKey := fmt.Sprint(k)
		result[strKey] = v
	}

	return result
}
