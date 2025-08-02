const momenttz = require('moment-timezone');

module.exports ={
    defaultTimeZone : function(){
        return momenttz.tz(Date.now(),DEFAULT_TIMEZONE);
    },
    defaultTimeFormat : function(format){
        return momenttz.tz(Date.now(),DEFAULT_TIMEZONE).format(format);
    },
    convertTimeZone: function(date,format){
        return momenttz.tz(date, DEFAULT_TIMEZONE).format(format); 
    },
    unixDateTimeFormat : function(){  // miliseconds
        return momenttz().tz(DEFAULT_TIMEZONE).valueOf();
    },
    localTime: function(datetimestamp,format){
        return momenttz.utc(momenttz.unix(datetimestamp)).tz(DEFAULT_TIMEZONE).format(format);
    },
    setExpiredTime: function(num,times){
        return momenttz().tz(DEFAULT_TIMEZONE).add(num,times).valueOf(); //'minutes'
    },
   weekend: () => [
    moment().tz(DEFAULT_TIMEZONE).day("Sunday").weekday(),
    moment().day("Saturday").weekday(),
  ],


}