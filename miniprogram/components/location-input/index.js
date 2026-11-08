const {suggestLocations}=require('../../utils/location-suggestions');
Component({properties:{value:{type:String,value:''},placeholder:{type:String,value:'输入城市、县或区，例如：德清'}},data:{suggestions:[],open:false},methods:{
 input(e){const value=e.detail.value;this.setData({suggestions:suggestLocations(value),open:true});this.triggerEvent('change',{value})},
 focus(){clearTimeout(this.closeTimer);this.setData({suggestions:suggestLocations(this.data.value),open:true})},
 blur(){this.closeTimer=setTimeout(()=>this.setData({open:false}),180)},
 pick(e){clearTimeout(this.closeTimer);this.setData({open:false});this.triggerEvent('change',{value:e.currentTarget.dataset.value})},
 confirm(){this.setData({open:false});this.triggerEvent('confirm',{value:this.data.value})}
},lifetimes:{detached(){clearTimeout(this.closeTimer)}}});
