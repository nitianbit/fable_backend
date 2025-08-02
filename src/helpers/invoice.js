const fs = require('fs');
const pdf = require('html-pdf');
const Handlebars = require('handlebars');
const moment = require("moment-timezone")
var path = require('path');


module.exports = {

    generatePDF: async (userDetail, templateName,res) => {
        try {

            var fileDir = `./templates/${templateName}.html`;
            const filePath = path.join(__dirname, fileDir);
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = Handlebars.compile(source);
            const replacements = userDetail
            const html = template(replacements);

            var options = {
                format: 'A4',
                footer: {
                    "height": "10mm",
                    "contents": {
                        first: `created at : ${moment().tz('Asia/Kolkata').format('LLL')}`,
                        2: 'Second page', // Any page number is working. 1-based index
                        default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
                        last: 'Last Page'
                    }
                },
            };
            pdf.create(html).toBuffer(function(err, buffer){
                if(err){
                  console.log('err:', err);  
                }
  
                res.header('Content-type', 'application/pdf')
                res.send(buffer)
              });
             
              
        } catch (err) {
            return 'err while :' + err;
        }

    }
}
