const mongoose = require('mongoose');



const metaDataSchema = new mongoose.Schema({
  name: {
    type: String, index: true, trim: true, default: '',
  },
  value: {
    type:Object, default: {},
   },
}, {
  timestamps: true,
});



metaDataSchema.statics = {
	
	async create(name,Obj){
		if(!await this.exists({name,"value.country_name":Obj.country_name})){
			return new this({
				name,
				value:Obj
			}).save();	
		}
	},
	
}

/**
 * @typedef Meta_Log
 */
module.exports = mongoose.model('Meta_Data', metaDataSchema);