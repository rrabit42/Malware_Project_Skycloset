import React, {Component} from 'react'
import {
    StyleSheet,
    Text,
    View,
    Animated,
    PermissionsAndroid,
    LayoutAnimation,
    UIManager,
    Platform,
    Dimensions,
    ToastAndroid,
    BackHandler,
    TouchableWithoutFeedback,
    ActivityIndicator,
} from 'react-native'

import Geolocation from 'react-native-geolocation-service'
import {connect} from 'react-redux'
import AsyncStorage from '@react-native-community/async-storage'

import {setLatitude, setLongitude, setAddress, setWeather0, setWeather1, setWeather2, setWeather3, setWeekWeather, setCurrentWeather, setCurrentBias, setCurrentGender, setTmX, setTmY, setDust, setDist, setHourlyWeather} from '../../store/actions/index'
import {googleMapsKey, darkSkyKey, darkSkyKey2, sgisKey_ID, sgisKey_SECRET, airkoreaKey} from '../../../config/keys'
import symbolicateStackTrace from 'react-native/Libraries/Core/Devtools/symbolicateStackTrace'

class SplashScreen extends Component {
    state = {
        isLoaded : false,
        waited : false,
        AnimateDone : false,
        UserInfoPrepared : false,
        choiceStart : false,
        selecteGender : null,
    }

    constructor(){
        super()
        if(Platform.OS === 'android')
        {
            UIManager.setLayoutAnimationEnabledExperimental(true)
        }
    }

    componentWillMount = async() => {
        this.colorAnimateValue = new Animated.Value(0);

        this._getUserInfo()
        LocationPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        if(LocationPermission === PermissionsAndroid.RESULTS.GRANTED) {
            this.getLocation()
        }
        const done = await this.readyFor2500ms()
        if(!this.state.UserInfoPrepared) {
            this.animateToChoiceLayout()
        }
        if(done!==null) {
            this.setState({AnimateDone : true})
            console.log(this.state)
        }
    }

    componentDidMount = () => {
        Animated.timing(this.colorAnimateValue, {
            toValue : 150,
            duration : 1000,
            delay : 500,
        }).start()
    }

    readyFor2500ms = async() => {
        return new Promise((resolve) =>
            setTimeout (
                () => {resolve('result')},
                2500
            )    
        )
    }

    componentDidUpdate() {
        if(this.state.AnimateDone) {
            if(this.state.isLoaded) {
                if(!this.state.UserInfoPrepared) {
                    return
                }
                this.props.navigation.navigate('App')
            }
            else {
                if(!this.state.waited) {
                    ToastAndroid.show('네트워크 접속이 원활하지 않습니다.\n잠시만 기다려주세요.', ToastAndroid.SHORT)
                    //BackHandler.exitApp()
                    this.lastChance()
                }
                else {
                    ToastAndroid.show('네트워크 접속이 원활하지 않습니다.\n잠시 후 다시 시도해주세요.', ToastAndroid.SHORT)
                    BackHandler.exitApp()
                }
            }
        }   
    }

    lastChance = async () => {
        done = await this.readyFor2500ms()
                if (done !== null)
                    this.setState({waited : true})
    }

    animateToChoiceLayout = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring)
        this.setState({choiceStart:true})
    }

    onMalePress = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        this.setState({selecteGender : 'm'})
        
        // 임시 2019_06_18
        AsyncStorage.setItem('gender', 'm')
        AsyncStorage.setItem('bias', '0')
        this.props.onSetCurrentGender('m')
        this.props.onSetCurrentBias(0)
        this.setState({UserInfoPrepared : true})
    }

    onFemalePress = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        this.setState({selecteGender : 'f'})
        
        // 임시 2019_06_18
        AsyncStorage.setItem('gender', 'f')
        AsyncStorage.setItem('bias', '0')
        this.props.onSetCurrentGender('f')
        this.props.onSetCurrentBias(0)
        this.setState({UserInfoPrepared : true})
        console.log(this.state)
    }

    onSubmitPress = () => {
        AsyncStorage.setItem('gender', this.state.selecteGender)
        AsyncStorage.setItem('bias', '0')
        this.props.onSetCurrentGender(this.state.selecteGender)
        this.props.onSetCurrentBias(0)
        this.setState({UserInfoPrepared : true})
        console.log(this.state)
    }

    getLocation = () => {
            Geolocation.getCurrentPosition(
                (position) => {
                    this.props.onSetLatitude(position.coords.latitude)
                    this.props.onSetLongitude(position.coords.longitude)
                    this.getAddressFromGoogleApi()
                    this._getWeather()
                },
                (error) => {
                    console.log(error.code, error.message)
                },
                {enableHighAccuracy:true, timeout:15000, maximumAge:10000}
            )
    }

    async getAddressFromGoogleApi() {
        const api = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=';
        const latitude = this.props.latitude;
        const longitude = this.props.longitude;
        console.log(googleMapsKey);
        let apiRequestUrl = api + latitude + ',' + longitude + '&language=ko&key=' + googleMapsKey;

        try {
            let response = await this.fetch_retry(apiRequestUrl, 10);
            let responseJson = await response.json();
            const address =  responseJson.results[0].address_components[2].long_name + ' ' + responseJson.results[0].address_components[1].long_name
            this.props.onSetAddress(address);
        }
        catch (error) {
            console.error(error);
        }
    }

    _getWeather = () => {
        latitude = this.props.latitude
        longitude = this.props.longitude
        todayTime = Math.floor(new Date().getTime() / 1000)
        yesterTime = todayTime - 86400
        
        this.fetch_retry(`https://api.darksky.net/forecast/${darkSkyKey}/${latitude},${longitude}?exclude=minutely,alerts,flags&units=si`, 10)
            .then(response => response.json()) // 응답값을 json으로 변환
            .then(json => {
                console.log(json)
                this.props.onSetCurrentWeather({
                    currentTemp :json.currently.temperature,
                    currentTempApparent : json.currently.apparentTemperature,
                    currentHum : json.currently.humidity,
                    currentWs : json.currently.windSpeed,
                    currentWb : json.currently.windBearing,
                    currentUv : json.currently.uvIndex,
                    currentCc : json.currently.cloudCover,
                    currentIcon : json.currently.icon,
                });
                this.props.onSetWeather1({
                    tempMin : json.daily.data[0].temperatureMin,
                    tempMax : json.daily.data[0].temperatureMax,
                    tempMinApparent : json.daily.data[0].apparentTemperatureMin,
                    tempMaxApparent : json.daily.data[0].apparentTemperatureMax,
                    humidity : json.daily.data[0].humidity,
                    windSpeed : json.daily.data[0].windSpeed,
                    icon : json.daily.data[0].icon,
                    cloudCover : json.daily.data[0].cloudCover,
                    precip : json.daily.data[0].precipIntensityMax,
                });
                this.props.onSetWeather2({
                    tempMin : json.daily.data[1].temperatureMin,
                    tempMax : json.daily.data[1].temperatureMax,
                    tempMinApparent : json.daily.data[1].apparentTemperatureMin,
                    tempMaxApparent : json.daily.data[1].apparentTemperatureMax,
                    humidity : json.daily.data[1].humidity,
                    windSpeed : json.daily.data[1].windSpeed,
                    icon : json.daily.data[1].icon,
                    cloudCover : json.daily.data[1].cloudCover,
                });
                this.props.onSetWeather3({
                    tempMin : json.daily.data[2].temperatureMin,
                    tempMax : json.daily.data[2].temperatureMax,
                    tempMinApparent : json.daily.data[2].apparentTemperatureMin,
                    tempMaxApparent : json.daily.data[2].apparentTemperatureMax,
                    humidity : json.daily.data[2].humidity,
                    windSpeed : json.daily.data[2].windSpeed,
                    icon : json.daily.data[2].icon,
                    cloudCover : json.daily.data[2].cloudCover,
                });
                let hourlyWeather = []
                for(let i = 0;i<26;++i) {
                    hourlyWeather.push({
                        temp: json.hourly.data[i].temperature,
                        hum : json.hourly.data[i].humidity,
                        ws : json.hourly.data[i].windSpeed,
                        cc : json.hourly.data[i].cloudCover,
                        icon : json.hourly.data[i].icon,
                    })
                }
                this.props.onSetHourlyWeather(hourlyWeather);
                let weekWeather = []
                for(let i = 0;i<8;++i) {
                    weekWeather.push({
                        min : json.daily.data[i].temperatureMin,
                        max : json.daily.data[i].temperatureMax,
                        icon : json.daily.data[i].icon,
                    })
                }
                this.props.onSetWeekWeather(weekWeather)
            })
            .then(this.fetch_retry(`https://api.darksky.net/forecast/${darkSkyKey2}/${latitude},${longitude},${yesterTime}?exclude=currently,minutely,hourly,alerts,flags&units=si&lang=ko`, 10)
                .then(response2 => response2.json()) // 응답값을 json으로 변환
                .then(json2 => {
                    this.props.onSetWeather0({
                        tempMin : json2.daily.data[0].temperatureMin,
                        tempMax : json2.daily.data[0].temperatureMax,
                        tempMinApparent : json2.daily.data[0].apparentTemperatureMin,
                        tempMaxApparent : json2.daily.data[0].apparentTemperatureMax,
                        humidity : json2.daily.data[0].humidity,
                        windSpeed : json2.daily.data[0].windSpeed,
                        icon : json2.daily.data[0].icon,
                        cloudCover : json2.daily.data[0].cloudCover,
                    });
                })
            )
            .then(this.fetch_retry(`https://sgisapi.kostat.go.kr/OpenAPI3/auth/authentication.json?consumer_key=${sgisKey_ID}&consumer_secret=${sgisKey_SECRET}`, 10)
                .then(response3 => response3.json()) // 응답값을 json으로 변환
                .then(json3 => {
                    this.fetch_forSGIS(`https://sgisapi.kostat.go.kr/OpenAPI3/transformation/transcoord.json?accessToken=${json3.result.accessToken}&src=4326&dst=5181&posX=${longitude}&posY=${latitude}`, 10)
                    .then(json4 => {
                        this.props.onSetTmX(json4.result.posX);
                        this.props.onSetTmY(json4.result.posY);
                        this.fetch_retry(`http://openapi.airkorea.or.kr/openapi/services/rest/MsrstnInfoInqireSvc/getNearbyMsrstnList?serviceKey=${airkoreaKey}&tmX=${json4.result.posX}&tmY=${json4.result.posY}&_returnType=json`, 10)
                        .then(response5 => response5.json())
                        .then(json5 => {
                            this.props.onSetDist({name : json5.list[0].stationName, dist : json5.list[0].tm});
                            console.log(json5)
                            this.fetch_retry(`http://openapi.airkorea.or.kr/openapi/services/rest/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=${json5.list[0].stationName}&dataTerm=daily&ServiceKey=${airkoreaKey}&ver=1.0&_returnType=json`, 10)
                            .then(response6 => response6.json())
                            .then(json6 => {
                                this.props.onSetDust(json6.list[0]);
                                if(json6.list[0].pm25Value === '-') {
                                    this.fetch_retry(`http://openapi.airkorea.or.kr/openapi/services/rest/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=${json5.list[1].stationName}&dataTerm=daily&ServiceKey=${airkoreaKey}&ver=1.0&_returnType=json`, 10)
                                    .then(response7 => response7.json())
                                    .then(json7 => {
                                        if(json7.list[0].pm25Value === '-') {
                                            this.fetch_retry(`http://openapi.airkorea.or.kr/openapi/services/rest/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=${json5.list[1].stationName}&dataTerm=daily&ServiceKey=${airkoreaKey}&ver=1.0&_returnType=json`, 10)
                                            .then(response8 => response8.json())
                                            .then(json8 => {
                                                if(json8.list[0].pm25Value === '-') {
                                                    this.props.onSetDust({...json6.list[0], pm25Value : 25});
                                                }
                                                else {
                                                    this.props.onSetDust({...json6.list[0], pm25Value : json8.list[0].pm25Value});
                                                }
                                            })
                                        }
                                        else {
                                            this.props.onSetDust({...json6.list[0], pm25Value : json7.list[0].pm25Value});
                                        }
                                    })
                                }
                                this.setState({isLoaded : true})
                            })
                        })
                    })
                })
            )
    }

    _getUserInfo = async () => {/*
        try {
            const userGender = await AsyncStorage.getItem('gender')
            if(userGender !== null) { // userInfo 존재
                let userBias = await AsyncStorage.getItem('bias')
                if(userBias === null) {
                    await AsyncStorage.setItem('bias', '0')
                    userBias = '0'
                }
                this.props.onSetCurrentGender(userGender)
                this.props.onSetCurrentBias(Number(userBias))
                this.setState({UserInfoPrepared : true})
            }
        } catch(e) {
            this._getUserInfo()
        }*/
        AsyncStorage.getItem('gender')
        .then(userGender => {
            if(userGender !== null) { // userInfo 존재
                AsyncStorage.getItem('bias')
                .then(userBias => {
                    if(userBias === null) {
                        AsyncStorage.setItem('bias', '0')
                        userBias = '0'
                    }
                    this.props.onSetCurrentGender(userGender)
                    this.props.onSetCurrentBias(Number(userBias))
                    this.setState({UserInfoPrepared : true})
                })
            }
        })
    }

    fetch_retry = (url, n) => fetch(url).then((response) => {
        if (response == 'undefined')
            return fetch_retry(url, n - 1)
        else
            return response
    })

    fetch_forSGIS = (url, n) => fetch(url).then(response => response.json())
    .then(json => {
        if (json.errMsg != 'Success')
            return this.fetch_forSGIS(url, n - 1)
        else
            return json
    })

    render() {
        const window = Dimensions.get('window')
        const logoColor = this.colorAnimateValue.interpolate( {
            inputRange : [0, 150],
            outputRange : ['#00C1DE', '#FFFFFF']
        })
        const screenColor = this.colorAnimateValue.interpolate( {
            inputRange : [0, 150],
            outputRange : ['#FFFFFF', '#00C1DE']
        })
        const logoScreenAnimate = this.state.choiceStart ? {
            backgroundColor : screenColor,
            borderRadius: window.width * 0.7,
            width: window.width * 1.4,
            height: window.width * 1.4,
            marginLeft: -(window.width * 0.2),
            marginBottom : window.width * 0.8,
            position: 'absolute',
            bottom: 0,
            overflow: 'hidden',
            paddingBottom : "5%",
        } : {
            backgroundColor : screenColor
        }
        const choiceScreenAnimate = this.state.choiceStart ? {
            backgroundColor : 'white',
            height: "100%",
            marginBottom:"-110%",
            position: 'absolute',
            bottom:0,
        } : {
            backgroundColor : screenColor
        }
        const logoAnimate = {
            tintColor : logoColor
        }
        const textAnimate = this.state.choiceStart ? {
            color : screenColor
        } : {
            color : logoColor
        }
        const bgTopAnimate = this.state.choiceStart ? {
            backgroundColor : screenColor,
            width: window.width,
            height: "15%",
        } : {
            backgroundColor : screenColor,
            width: window.width,
            height: "100%",
            position: 'absolute',
            bottom:0,
        }
        const maleButton = (this.state.selecteGender === 'm') ? {
            backgroundColor : '#00C1DE',
            borderColor : '#00C1DE',
        } : null
        const maleButtonText = (this.state.selecteGender === 'm') ? {
            color : 'white'
        } : null
        const femaleButton = (this.state.selecteGender === 'f') ? {
            backgroundColor : '#00C1DE',
            borderColor : '#00C1DE',
        } : null
        const femaleButtonText = (this.state.selecteGender === 'f') ? {
            color : 'white'
        } : null
        return (
            <Animated.View style={styles.container}>
                <Animated.View style={bgTopAnimate}>
                    <Text> </Text>
                </Animated.View>
                <Animated.View style={[styles.logoContainer, logoScreenAnimate]}>
                    <Animated.Image
                        style={[styles.logoImgStyle, logoAnimate]}
                        source={require('../../assets/images/logo/logo_white.png')}
                        resizeMode="stretch"
                    />
                    <Animated.Text style={[styles.titleTextKOR, textAnimate]}>
                        하늘 옷장
                    </Animated.Text>
                    <Animated.Text style={[styles.titleTextENG, textAnimate]}>
                        SKY CLOSET
                    </Animated.Text>
                </Animated.View>
                <Animated.View style={[styles.choiceContainer, choiceScreenAnimate]}>
                    {(this.state.choiceStart) && (
                    <Animated.View style={styles.choiceView}>
                        <Text style={styles.choiceText}>
                            당신의 성별을 선택해주세요.
                        </Text>
                        <View style={styles.buttonContainer}>
                            <TouchableWithoutFeedback onPress={this.onFemalePress}>
                                <View style={[styles.button, femaleButton]}>
                                    <Text
                                        style={[styles.buttonText, femaleButtonText]}>
                                        여자
                                    </Text>
                                </View>
                            </TouchableWithoutFeedback>
                            <View style={{width:"7%"}}/>
                            <TouchableWithoutFeedback onPress={this.onMalePress}>
                                <View style={[styles.button, maleButton]}>
                                    <Text
                                        style={[styles.buttonText, maleButtonText]}>
                                        남자
                                    </Text>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                        <View style={{height:"4%"}}></View>
                    </Animated.View>
                    )}
                </Animated.View>
                {(this.state.AnimateDone && !this.state.isLoaded) && 
                    <View style={styles.overlayContainer}>
                        <ActivityIndicator size="large" color="#0000ff"/>
                    </View>
                }
            </Animated.View>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        backgroundColor : 'white',
        marginTop: (Platform.OS === 'ios') ? 20 : 0
    },
    logoContainer: {
        height:"60%",
        width:"100%",
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom : "13.5%",
    },
    logoImgStyle : {
        width: 128,
        height: 128,
        marginBottom : "3%",
    },
    choiceContainer: {
        width:"100%",
        height:"40%",
        alignItems: 'center',
    },
    titleTextKOR: {
        fontSize : 20,
        fontFamily : "LogoKOR-Medium",
        marginBottom : 10,
    },
    titleTextENG: {
        fontSize : 15,
        fontFamily : "LogoENG-Medium",
    },
    choiceView : {
        alignItems : "center"
    },
    choiceText : {
        fontSize : 18,
        marginBottom : "12%",
    },
    buttonContainer : {
        flexDirection : 'row',
    },
    button : {
        width : Dimensions.get('window').width * 0.35,
        height : Dimensions.get('window').width * 0.35,
        borderRadius : Dimensions.get('window').width * 0.175,
        borderColor : '#707070',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth : 1,
    },
    buttonText : {
        fontSize : 15,
        fontFamily : "Bongodik"
    },
    overlayContainer : {
        position: 'absolute',
        height: '100%',
        width: '100%',
        backgroundColor: '#fff',
        opacity: 0.6,
        alignItems: 'center',
        justifyContent: 'center',
    }
})

const mapStateToProps = state => {
    return {
        latitude: state.geoloc.latitude,
        longitude: state.geoloc.longitude,
        address: state.geoloc.address,
        tm_x : state.geoloc.tm_x,
        tm_y : state.geoloc.tm_y,
        weather0: state.weather.weather0,
        weather1: state.weather.weather1,
        weather2: state.weather.weather2,
        weather3: state.weather.weather3,
        currentBias : state.current.currentBias,
        currentGender : state.current.currentGender,
        currentWeather : state.current.currentWeather,
        dust : state.dust.dust,
        dist : state.dust.dist,
    }
}

const mapDispatchToProps = dispatch => {
    return {
        onSetLatitude: (latitude) => dispatch(setLatitude(latitude)),
        onSetLongitude: (longitude) => dispatch(setLongitude(longitude)),
        onSetAddress : (address) => dispatch(setAddress(address)),
        onSetTmX : (tm_x) => dispatch(setTmX(tm_x)),
        onSetTmY : (tm_y) => dispatch(setTmY(tm_y)),
        onSetWeather0 : (weather0) => dispatch(setWeather0(weather0)),
        onSetWeather1 : (weather1) => dispatch(setWeather1(weather1)),
        onSetWeather2 : (weather2) => dispatch(setWeather2(weather2)),
        onSetWeather3 : (weather3) => dispatch(setWeather3(weather3)),
        onSetWeekWeather : (weekWeather) => dispatch(setWeekWeather(weekWeather)),
        onSetHourlyWeather : (hourlyWeather) => dispatch(setHourlyWeather(hourlyWeather)),
        onSetCurrentBias : (currentBias) => dispatch(setCurrentBias(currentBias)),
        onSetCurrentGender : (currentGender) => dispatch(setCurrentGender(currentGender)),
        onSetCurrentWeather : (currentWeather) => dispatch(setCurrentWeather(currentWeather)),
        onSetDust : (dust) => dispatch(setDust(dust)),
        onSetDist : (dist) => dispatch(setDist(dist)),
    }
}


export default connect(mapStateToProps, mapDispatchToProps)(SplashScreen)