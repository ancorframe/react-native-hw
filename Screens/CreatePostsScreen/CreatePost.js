import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Camera } from "expo-camera";
import {
  Dimensions,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

//icons
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "../../firebase/config";
import { FontAwesome5, EvilIcons, MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { user } from "../../redux/selectors/authSelector";
const initialState = { photo: null, location: null, place: "", name: "" };
const fonts = ["Roboto-Regular"];

export const CreatePost = ({ navigation }) => {
  const [focus, setFocus] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [camera, setCamera] = useState(null);
  const [state, setState] = useState({});
  const [type, setType] = useState(Camera.Constants.Type.back);
  const [isActiveBtn, setIsActiveBtn] = useState(false);
  const [dimensions, setDimensions] = useState(
    () => Dimensions.get("window").width - 16 * 2
  );
  const { userId, nickname } = useSelector(user);
  // console.log(state);

  useEffect(() => {
    const { photo, name } = state;
    setIsActiveBtn(photo && name);

    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        await MediaLibrary.requestPermissionsAsync();
        let foreground = await Location.requestForegroundPermissionsAsync({});
        if (foreground.status !== "granted") {
          console.log("no access to location");
        }
        setHasPermission(status === "granted");
      } catch (error) {
        console.log("permitions", error);
      }
    })();
  }, [state]);

  const takePhoto = async () => {
    try {
      if (photo) {
        setState((prev) => ({ ...prev, photo: null }));
        return;
      }
      const snap = await camera.takePictureAsync();
      const { coords } = await Location.getCurrentPositionAsync();
      setState((prev) => ({
        ...prev,
        location: { latitude: coords.latitude, longitude: coords.longitude },
        photo: snap.uri,
      }));
    } catch (error) {
      console.log("takephoto ", error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        setState((prev) => ({ ...prev, photo: result.assets[0].uri }));
      }
    } catch (error) {
      console.log("pick image", error);
    }
  };

  const changeCameraType = () => {
    setType(
      type === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };
  const uploadPhotoToServer = async () => {
    try {
      const uniqueId = Date.now().toString();
      const storageRef = ref(storage, `postImage/${uniqueId}`);
      const response = await fetch(state.photo);
      const file = await response.blob();
      await uploadBytes(storageRef, file);

      const processedPhoto = await getDownloadURL(storageRef);

      return processedPhoto;
    } catch (error) {
      console.error("log", error);
    }
  };
  const onPublicPost = async () => {
    try {
      setIsActiveBtn(false);
      // console.log(state);
      const photo = await uploadPhotoToServer();
      // console.log("photo", photo);
      await addDoc(collection(db, "posts"), {
        image: photo,
        name: state.name,
        location: {
          locationName: state.place,
          latitude: !state.location ? null : state.location.latitude,
          longitude: !state.location ? null : state.location.longitude,
        },
        userId,
        nickname,
        likes: 0,
        comments: [],
        createdAt: Date.now(),
      });

      setState(initialState);
      navigation.navigate("Posts");
    } catch (error) {
      console.log("create post ", error);
    } finally {
      setIsActiveBtn(true);
    }
  };
  // console.log(state.photo);

  const onTouchOutOfInput = () => {
    Keyboard.dismiss();
    setFocus(false);
  };

  // if (hasPermission === null) {
  //   return <View />;
  // }
  // if (hasPermission === false) {
  //   return <Text>No access to camera</Text>;
  // }
  const { photo, name, place } = state;
  return (
    <TouchableWithoutFeedback onPress={onTouchOutOfInput}>
      <View style={styles.container}>
        <View style={{ marginBottom: 32, position: "relative" }}>
          <Camera
            type={type}
            style={{ ...styles.loadImgBox, width: dimensions }}
            ref={setCamera}
          >
            {photo && (
              <Image source={{ uri: photo }} style={styles.afterSnapPhoto} />
            )}
          </Camera>
          <TouchableOpacity activeOpacity={0.8} onPress={pickImage}>
            <Text style={{ ...styles.loadImgText, fontFamily: fonts[0] }}>
              Загрузите фото
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.loadImgButton}
            onPress={takePhoto}
            disabled={!hasPermission}
          >
            <FontAwesome5 name="camera" size={24} color="black" />
          </TouchableOpacity>
          {!photo && (
            <TouchableOpacity
              style={styles.changeCameraButton}
              onPress={changeCameraType}
              disabled={!hasPermission}
            >
              <MaterialIcons name="flip-camera-ios" size={24} color="black" />
            </TouchableOpacity>
          )}
        </View>
        <View>
          <TextInput
            placeholder="Название..."
            style={{ ...styles.input, fontFamily: fonts[0] }}
            onFocus={() => setFocus(true)}
            onChangeText={(name) => setState((prev) => ({ ...prev, name }))}
            value={name}
          />
        </View>
        <View style={styles.locationInputContainer}>
          <EvilIcons
            name="location"
            size={24}
            color="black"
            style={{ marginRight: 5, paddingTop: 8 }}
          />
          <TextInput
            placeholder="Местность..."
            style={{ ...styles.input, fontFamily: fonts[0] }}
            onFocus={() => setFocus(true)}
            onChangeText={(place) => setState((prev) => ({ ...prev, place }))}
            value={place}
          />
        </View>
        {!focus && (
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!isActiveBtn}
            style={{
              ...styles.btn,
              backgroundColor: isActiveBtn ? "#FF6C00" : "#F6F6F6",
            }}
            onPress={onPublicPost}
          >
            <Text
              style={{
                ...styles.btnText,
                fontFamily: fonts[0],
                color: isActiveBtn ? "#FFFFFF" : "#BDBDBD",
              }}
            >
              Опубликовать
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  loadImgBox: {
    position: "relative",
    height: 240,
    backgroundColor: "#F6F6F6",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    // borderRadius: 8,
  },
  loadImgText: {
    paddingTop: 8,
    color: "#BDBDBD",
    fontSize: 16,
    // lineHeight: 19,
    // fontWeight: 400,
  },
  loadImgButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -30 }, { translateY: -30 }],
    backgroundColor: "#FFFFFF",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    // borderRadius: "50%",
    zIndex: 100,
  },
  changeCameraButton: {
    position: "absolute",
    top: "70%",
    left: "85%",
    backgroundColor: "#FFFFFF",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    // borderRadius: "50%",
    zIndex: 100,
  },
  input: {
    fontSize: 16,
    lineHeight: 19,
    paddingVertical: 16,
    borderBottomWidth: 1,
    color: "#212121",
    borderBottomColor: "#E8E8E8",
  },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    color: "#212121",
    borderBottomColor: "#E8E8E8",
    marginTop: 16,
  },
  btn: {
    alignItems: "center",
    marginTop: 32,
    paddingVertical: 16,
    // borderRadius: 100,
  },
  btnText: {
    fontSize: 16,
    lineHeight: 19,
  },
  afterSnapPhoto: {
    position: "absolute",
    flex: 1,
    width: "100%",
    height: 240,
    zIndex: 20,
  },
});
