<template>
  <div class="container">
        <div role="form">
          <p>一个演示ThreeDXF预览的小例子</p>
            <div class="form-group">
                <label for="exampleInputFile">选择一个DXF文件</label>
                <input type="file" accept=".dxf" id="dxf" name="file" @change="onFileSelected">
                <div class="progress progress-striped" style="width: 300px;">
                    <div id="file-progress-bar" class="progress-bar progress-bar-success" role="progressbar" style="width: 0">
                    </div>
                </div>
                <div id="file-description" class="help-block"></div>
            </div>
            <p>在画布上悬停时：左键单击就可以平移。鼠标滚轮可放大或缩小图像，字体显示也可以替换，如需显示文字，把下方注释代码打开即可显示</p>
        </div>
        <div class="code-editor-wrapper" v-loading="dxfLoading">
          <div id="dxf-view"  ref="dxfView" class="dxfView" ></div>
        </div>
       
        <!-- <div id="dxf-content-container">
            <pre id="dxf-content">
            </pre>
        </div> -->
    </div>
</template>

<script>
import DxfParser from 'dxf-parser'
import { Viewer } from '/public/threedxf/three-dxf.js'
export default {
  name: 'ThreeDXF',
  data () {
    return {
      dxfLoading:false
    }
  },
  methods:{
    onFileSelected(evt) {
      let self = this;
        var file = evt.target.files[0];
        var reader = new FileReader();
        reader.onprogress = self.updateProgress;
        reader.onloadend = self.onSuccess;
        reader.onabort = self.abortUpload;
        reader.onerror = self.errorHandler;
        reader.readAsText(file);
    },
    errorHandler(evt) {
      switch(evt.target.error.code) {
      case evt.target.error.NOT_FOUND_ERR:
          alert('File Not Found!');
          break;
      case evt.target.error.NOT_READABLE_ERR:
          alert('File is not readable');
          break;
      case evt.target.error.ABORT_ERR:
          break;
      default:
          alert('An error occurred reading this file.');
      }
  },
  onSuccess(evt){;
    this.dxfLoading=true
      var fileReader = evt.target;
      if(fileReader.error) return console.log("error onloadend!?");
      var parser = new DxfParser();
      var dxf = parser.parseSync(fileReader.result);
 
      // let dxfContentEl = document.getElementById('dxf-content');
       
      // if(dxf) {
      //     dxfContentEl.innerHTML = JSON.stringify(dxf, null, 2);
      //     console.log('json',JSON.stringify(dxf, null, 2))
      // } else {
      //     dxfContentEl.innerHTML = 'No data.';
      // }
      document.getElementById('dxf-view').innerHTML = ""
      let  width=this.$refs.dxfView.offsetWidth;
      let  height=this.$refs.dxfView.offsetHeight;
      Viewer(dxf, document.getElementById('dxf-view'), width, height,this.LoadingClose);
       
  },
  LoadingClose(){
      this.dxfLoading=false;
    },
  handleDragOver(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy';
  },
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
 .code-editor-wrapper {
    margin: 56px auto 0 auto;
    width: 70vw !important;
    height:70vh;
    border: 1px solid #000;
  }

  .dxfView{
      width: 70vw;
      height:70vh;
      background: #fff;
    }
</style>
