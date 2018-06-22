<template>
  <div>
    <section>
      <button v-on:click="reload">reload</button>

      <span>
        code list from
        <a href="https://disclosure.edinet-fsa.go.jp/E01EW/BLMainController.jsp?uji.verb=W1E62071InitDisplay&uji.bean=ee.bean.W1E62071.EEW1E62071Bean&TID=W1E62071&PID=currentPage&SESSIONKEY=1529648908382&kbn=2&ken=108&res=108&idx=0&start=1&end=100&spf1=1&spf2=1&spf5=1&psr=1&pid=0&row=100&str=&flg=&lgKbn=2&pkbn=0&skbn=1&dskb=&askb=&dflg=0&iflg=0&preId=1" target="_new">
          here
        </a>
      </span>
    </section>

    <label>
      <input type="radio" value="all" v-model="radio">全て
    </label>
    <label>
      <input type="radio" value="listed" v-model="radio">上場
    </label>

    <span>
      {{rowsFiltered.length}}件
    </span>

    <table class="table table-bordered table-hover">
      <thead>
        <tr>
          <th class="col" v-for="value in header" :key="value">
            {{ value }}
          </th>
        </tr>
      </thead>
      <tbody v-cloak>
        <tr v-for="row in rowsFiltered">
          <td v-for="(value, i) in header" :key="i">
            <template v-if="i == 0">
              <a target="_blank" :href="edinetSearchUrl(row[i])">
                {{ row[i] }}
              </a>
            </template>
            <template v-else-if="i == 11">
              <a target="_blank" :href="kabuProUrl(row[i])">
                {{ row[i] }}
              </a>
            </template>
            <template v-else>
              {{ row[i] }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import JSZip from "jszip";
import Axios from "axios";
import iconv from "iconv-lite";

export default {
  name: 'edinet-code-list',
  data() {
    return {
      csv: [],
      header: [],
      radio: "listed",
    }
  },
  computed: {
    rowsFiltered() {
      if(this.radio == "all") {
        return this.csv;
      } else {
        return this.csv.filter((row) => row[2] == "上場")
      }
    }
  },
  methods: {
    edinetCodeListUrl: function() {
      return `/Edinetcode.zip`

      // NOTE: CORS のため直接取得できない
      //return `https://disclosure.edinet-fsa.go.jp/E01EW/download?uji.verb=W1E62071EdinetCodeDownload&uji.bean=ee.bean.W1E62071.EEW1E62071Bean&TID=W1E62071&PID=W1E62071&SESSIONKEY=1527576724074&downloadFileName=&lgKbn=2&dflg=0&iflg=0&dispKbn=1`
    },
    edinetSearchUrl: function(edinet_code) {
      return `https://disclosure.edinet-fsa.go.jp/E01EW/BLMainController.jsp?uji.verb=W1E63020CXW1E6A020DSPSch&uji.bean=ee.bean.parent.EECommonSearchBean&PID=W1E63020&TID=W1E63021&SESSIONKEY=1528440672333&lgKbn=2&pkbn=0&skbn=0&dskb=&dflg=0&iflg=0&preId=1&row=100&idx=0&syoruiKanriNo=&sec=${edinet_code}&scc=&shb=&snm=&spf1=1&spf2=1&iec=&icc=&inm=&spf3=1&fdc=&fnm=&spf4=1&spf5=1&cal=1&era=H&yer=&mon=&psr=1&pfs=4`
    },
    kabuProUrl: function(security_code) {
      return `http://ke.kabupro.jp/code/${security_code.slice(0, 4)}.htm`
    },
    convert: function(csvText) {
      const gen = function*() {
        const rows = csvText.split("\n")
        yield rows[1].split(",") // header

        const to = rows.length;
        // const to = rows.length/100; // for debug
        for(let i=2; i<to; ++i) {
          if(rows[i].length == 0) { continue }
          yield JSON.parse(`[${rows[i]}]`)
        }
      };

      const g = gen()
      this.header = g.next().value
      this.csv = Array.from(g)

      console.log(this.header)
      console.log(this.csv.length)
    },
    fetch: async function() {
      const touch = await Axios.get("/touch") // check update
      console.log(touch)

      const url = this.edinetCodeListUrl();
      console.log(url)
      const res = await Axios.get(url, { responseType : 'blob' });
      console.log(res.data.size);

      const zipfile = await new JSZip().loadAsync(res.data);
      console.assert("EdinetcodeDlInfo.csv" in zipfile.files)
      const buffer = await zipfile.file("EdinetcodeDlInfo.csv").async("nodebuffer");

      return iconv.decode(buffer, "CP932")
    },
    reload: function() {
      console.log("start")
      this.fetch()
        .then((text) => {
          console.log("convert");
          this.convert(text);
        })
        .catch((err) => {
          console.error(err);
        })
    },
  },
  created: function() {
    this.reload();
  }
}
</script>